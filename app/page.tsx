export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="mb-8 text-center text-4xl font-bold">bajetAI</h1>
        <p className="mb-4 text-center text-xl text-muted-foreground">
          AI-Powered Budget Transparency Platform
        </p>
        <p className="text-center text-muted-foreground">
          Budget transparency and citizen engagement for county and national governments
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-6">
            <h2 className="mb-2 text-xl font-semibold">For Officials</h2>
            <p className="text-sm text-muted-foreground">
              Upload budget documents, generate AI summaries, and review citizen feedback
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="mb-2 text-xl font-semibold">For Citizens</h2>
            <p className="text-sm text-muted-foreground">
              View budget summaries in English and Swahili, submit comments and feedback
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Phase 0: Project Setup - Next.js initialized successfully ✓</p>
        </div>
      </div>
    </main>
  );
}
