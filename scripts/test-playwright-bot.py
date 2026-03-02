import asyncio
from playwright.async_api import async_playwright
import os
import json

# Configuration variables
BASE_URL = "http://localhost:3000"

# List of questions for evaluation
TEST_QUERIES = [
    "What are the main priorities in this document?",
    "Does this document mention any specific budget figures for education?",
    "What is the summary of the health section?",
    "How does the budget for this year compare to the previous year if mentioned?",
    "Are there any specific risks or challenges identified?"
]

async def main():
    async with async_playwright() as p:
        # Launch browser in non-headless mode so you can watch the bot work!
        # Change headless=True if you want it to run silently in the background
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print("1. Acting as a normal public user...")
        # Normal users don't need to log in to view and chat with documents
        await page.goto(f"{BASE_URL}/participate")
        
        print("Waiting for documents to load...")
        # Wait for at least one document card to render
        await page.wait_for_selector('a[href^="/participate/documents/"]', timeout=30000)

        print("2. Selecting a public document to read...")
        # Get the first document's link and click it
        first_doc_link = await page.get_attribute('a[href^="/participate/documents/"]', 'href')
        print(f"Opening document: {first_doc_link}")
        await page.click('a[href^="/participate/documents/"]')

        print("3. Opening the Chat interface...")
        # The chat is inside a Sheet (sidebar)
        chat_trigger_selector = 'button:has(svg.lucide-message-square), button:has-text("Ask a Question")'
        await page.wait_for_selector(chat_trigger_selector, timeout=30000)
        await page.click(chat_trigger_selector)
        
        print("4. Waiting for chat UI to load...")
        chat_input_selector = 'textarea'
        await page.wait_for_selector(chat_input_selector, state='visible', timeout=15000)
        
        qa_pairs = []
        
        print(f"5. Querying the Chat endpoint with {len(TEST_QUERIES)} questions...")
        
        for i, query in enumerate(TEST_QUERIES):
            print(f"\n--- Question {i+1}/{len(TEST_QUERIES)} ---")
            print(f"Query: '{query}'")
            
            # Get the current number of bot responses to know when a new one arrives
            bot_msg_selector = 'div.bg-muted > p.whitespace-pre-wrap'
            initial_count = await page.locator(bot_msg_selector).count()
            
            # Send the query
            await page.fill(chat_input_selector, query)
            await page.press(chat_input_selector, "Enter")
            
            # Wait for response...
            try:
                # Wait for the number of bot messages to increase
                # We use a 60s timeout as RAG queries can sometimes take a while
                # The 'arg' is passed as a single list, so we destructure it in JS
                await page.wait_for_function(
                    "([selector, count]) => document.querySelectorAll(selector).length > count",
                    arg=[bot_msg_selector, initial_count],
                    timeout=60000
                )
                
                # Small extra wait to ensure the stream has finished if it's dynamic
                await asyncio.sleep(1)
                
                # Get the latest response
                latest_response = page.locator(bot_msg_selector).last
                answer = await latest_response.inner_text()
                
                print(f"Answer received: {answer[:100]}...")
                
                qa_pairs.append({
                    "question": query,
                    "answer": answer
                })
                
            except Exception as e:
                print(f"Error waiting for response to question {i+1}: {e}")
                qa_pairs.append({
                    "question": query,
                    "answer": f"ERROR: Response timed out or failed. {str(e)}"
                })

        # Save all question-answer pairs for further evaluation
        output_file = "evaluation_results.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(qa_pairs, f, indent=4, ensure_ascii=False)
        
        print(f"\n{'='*40}")
        print(f"Evaluation complete! {len(qa_pairs)} pairs saved to {output_file}")
        print(f"{'='*40}")
        
        # Give you 3 seconds to look at the screen before closing
        await asyncio.sleep(3)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

