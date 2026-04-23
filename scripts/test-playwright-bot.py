import asyncio
from playwright.async_api import async_playwright
import os
import json
import csv

# ============================================================
# CONFIGURATION
# ============================================================
BASE_URL = "http://localhost:3000"
DOCUMENT_ID = "7789e136-f510-4192-9082-f9e5f4e3c6e5"

# Path to the evaluation CSV (source of questions + ground_truth)
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "testfiles", "evaluation_dataset.csv")
# ============================================================

# Read dataset — only the questions and ground_truth columns matter here
dataset = []
with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        dataset.append(row)

TEST_QUERIES = [row["question"] for row in dataset]


async def main():
    async with async_playwright() as p:
        # ── Launch browser (headless=False so you can watch!) ──────────────
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print("1. Navigating to public documents page...")
        await page.goto(f"{BASE_URL}/participate")

        print("   Waiting for document cards to load...")
        await page.wait_for_selector('a[href^="/participate/documents/"]', timeout=30000)

        print("2. Opening the target document...")
        await page.click(f'a[href^="/participate/documents/{DOCUMENT_ID}"]')

        print("3. Opening the Chat interface...")
        chat_trigger_selector = 'button:has(svg.lucide-message-square), button:has-text("Ask a Question")'
        await page.wait_for_selector(chat_trigger_selector, timeout=30000)
        await page.click(chat_trigger_selector)

        print("4. Waiting for chat UI to be ready...")
        chat_input_selector = "textarea"
        await page.wait_for_selector(chat_input_selector, state="visible", timeout=15000)

        qa_results = []
        CHAT_API_PATH = f"/api/public/documents/{DOCUMENT_ID}/chat"

        print(f"\n5. Running {len(TEST_QUERIES)} questions through the chat...\n")

        for i, query in enumerate(TEST_QUERIES):
            print(f"--- Question {i+1}/{len(TEST_QUERIES)} ---")
            print(f"  Q: {query[:80]}{'...' if len(query) > 80 else ''}")

            # ── Set up network interception BEFORE sending the message ──────
            # We capture the chat API JSON response to extract retrieved contexts
            captured_api_response = {}

            async def handle_response(response):
                if CHAT_API_PATH in response.url and response.request.method == "POST":
                    try:
                        captured_api_response.update(await response.json())
                    except Exception as e:
                        print(f"  [WARN] Could not parse API response JSON: {e}")

            page.on("response", handle_response)

            # ── Count existing bot messages so we know a new one arrived ────
            bot_msg_selector = "div.bg-muted > p.whitespace-pre-wrap"
            initial_count = await page.locator(bot_msg_selector).count()

            # ── Type and send the question ───────────────────────────────────
            await page.fill(chat_input_selector, query)
            await page.press(chat_input_selector, "Enter")

            # ── Wait for the bot's reply to appear in the UI ─────────────────
            try:
                await page.wait_for_function(
                    "([selector, count]) => document.querySelectorAll(selector).length > count",
                    arg=[bot_msg_selector, initial_count],
                    timeout=60000,
                )
                # Give the stream a moment to finish if it's streaming
                await asyncio.sleep(1.5)

                # Get the answer text from the UI
                answer = await page.locator(bot_msg_selector).last.inner_text()

                # Extract retrieved contexts from the intercepted API response.
                # sources[].preview is what the RAG pipeline actually retrieved —
                # this is the ground truth for RAGAS evaluation.
                sources = captured_api_response.get("sources", [])
                contexts = [src.get("chunkText") or src.get("preview", "") for src in sources if src.get("chunkText") or src.get("preview")]

                tokens   = captured_api_response.get("metadata", {}).get("tokensUsed", "n/a")
                latency  = captured_api_response.get("metadata", {}).get("latencyMs", "n/a")
                language = captured_api_response.get("language", "n/a")

                print(f"  A: {answer[:100]}{'...' if len(answer) > 100 else ''}")
                print(f"  ✓ {len(contexts)} context chunks captured | lang={language} | tokens={tokens} | {latency}ms")

                qa_results.append({
                    "question": query,
                    "answer": answer,
                    "contexts": contexts,
                })

            except Exception as e:
                print(f"  ✗ Error on question {i+1}: {e}")
                qa_results.append({
                    "question": query,
                    "answer": f"ERROR: {str(e)}",
                    "contexts": [],
                })

            # Remove the listener before the next question to avoid duplicates
            page.remove_listener("response", handle_response)

        # ── Merge results back into the dataset (preserving ground_truth) ──
        for i, row in enumerate(dataset):
            if i < len(qa_results):
                row["answer"]   = qa_results[i]["answer"]
                # Store as JSON list string — RAGAS_Evaluation.py reads it
                # back with ast.literal_eval, which handles JSON lists fine
                row["contexts"] = json.dumps(qa_results[i]["contexts"], ensure_ascii=False)

        # Write updated CSV
        with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["question", "answer", "contexts", "ground_truth"])
            writer.writeheader()
            writer.writerows(dataset)

        print(f"\n{'='*50}")
        print(f"[INFO] Dataset updated with real retrieved contexts: {CSV_PATH}")
        print(f"[INFO] {len(qa_results)} rows written")
        print(f"{'='*50}\n")

        # Also save a raw debug JSON
        debug_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evaluation_results.json")
        with open(debug_path, "w", encoding="utf-8") as f:
            json.dump(qa_results, f, indent=4, ensure_ascii=False)
        print(f"[INFO] Raw results saved to: {debug_path}")

        # Give you a few seconds to look at the screen before closing
        await asyncio.sleep(3)
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
