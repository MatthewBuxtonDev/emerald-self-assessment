import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-500">
            Next-Generation Learning
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-16 sm:py-24">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-zinc-900">
              Discover Your
              <br />
              <span className="text-blue-600">Learning Profile</span>
            </h1>
            <p className="text-lg text-zinc-500 leading-relaxed max-w-md mx-auto">
              A guided conversation to help you understand how you learn, what
              your strengths are, and what you could try next.
            </p>
          </div>

          <Link
            href="/about-you"
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-blue-600 text-white font-medium text-base hover:bg-blue-700 transition-colors"
          >
            Begin
          </Link>

          <div className="pt-12 border-t border-zinc-100">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-6">
              How it works
            </h2>
            <div className="grid sm:grid-cols-3 gap-6 text-left">
              {[
                {
                  step: "1",
                  title: "Tell us about you",
                  desc: "Share your interests and how you see yourself as a learner.",
                },
                {
                  step: "2",
                  title: "Have a conversation",
                  desc: "Answer a few questions about your learning experiences.",
                },
                {
                  step: "3",
                  title: "Get your profile",
                  desc: "Receive your personalised strengths and next steps.",
                },
              ].map((item) => (
                <div key={item.step} className="space-y-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {item.step}
                  </span>
                  <h3 className="font-medium text-zinc-900">{item.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
