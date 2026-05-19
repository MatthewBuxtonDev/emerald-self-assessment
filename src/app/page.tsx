import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <span className="text-xs sm:text-sm font-medium text-zinc-500">
            Next-Generation Learning
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 py-12 sm:py-24">
        <div className="max-w-xl w-full text-center space-y-8 sm:space-y-10">
          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight">
              Discover Your
              <br />
              <span className="text-blue-600">Learning Profile</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-md mx-auto">
              A guided conversation to help you understand how you learn, what
              your strengths are, and what you could try next.
            </p>
          </div>

          <Link
            href="/about-you"
            className="inline-flex items-center justify-center h-12 sm:h-14 px-8 sm:px-10 rounded-full bg-blue-600 text-white font-medium text-base sm:text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            Begin
          </Link>

          <div className="pt-10 sm:pt-14 border-t border-zinc-100">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-6 sm:mb-8">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-left">
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
                <div key={item.step} className="space-y-2 sm:space-y-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {item.step}
                  </span>
                  <h3 className="font-semibold text-zinc-900 text-sm sm:text-base">
                    {item.title}
                  </h3>
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
