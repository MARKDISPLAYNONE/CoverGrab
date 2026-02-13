import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";

export function SupportCancelPage() {
  useEffect(() => {
    document.title = "Payment Cancelled – CoverGrab";
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        {/* Info Icon */}
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-700 shadow-lg mb-8">
          <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-lg text-gray-400 mb-8">
          No worries! Your payment was cancelled and you haven't been charged.
          <br />
          CoverGrab is and will always be free to use.
        </p>

        {/* Options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/support"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 bg-gray-800/50 px-6 py-3 font-semibold text-white transition-all hover:bg-gray-700/50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Try Again</span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-600 hover:to-pink-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Back to CoverGrab</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
