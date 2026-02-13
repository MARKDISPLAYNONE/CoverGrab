import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export function SupportSuccessPage() {
  useEffect(() => {
    document.title = "Thank You! – CoverGrab";
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        {/* Success Icon */}
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20 mb-8">
          <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Thank You Message */}
        <h1 className="text-4xl font-bold mb-4">Thank You! 🎉</h1>
        <p className="text-xl text-gray-400 mb-8">
          Your support means the world and helps keep CoverGrab free and ad-free for everyone.
        </p>

        {/* Heart Animation */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <svg
              key={i}
              className="h-8 w-8 text-red-500 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          ))}
        </div>

        {/* Special Quote */}
        <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-8 mb-10">
          <blockquote className="text-xl italic text-gray-300 mb-4">
            "The best way to find yourself is to lose yourself in the service of others."
          </blockquote>
          <cite className="text-gray-500">— Mahatma Gandhi</cite>
        </div>

        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-8 py-4 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-600 hover:to-pink-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Back to CoverGrab</span>
        </Link>
      </div>
    </Layout>
  );
}
