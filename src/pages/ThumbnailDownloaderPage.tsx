import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { CoverTool } from "../components/CoverTool";
import { useEffect } from "react";

export function ThumbnailDownloaderPage() {
  useEffect(() => {
    document.title = "YouTube Thumbnail Downloader – Download Video Thumbnails Free | CoverGrab";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Download YouTube video thumbnails in high quality for free. No ads, no popups – just paste a YouTube link and get the thumbnail instantly.'
      );
    }
    
    // Update canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://covergrab.netlify.app/youtube-thumbnail-downloader');
    }
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">YouTube Thumbnail Downloader</span>
        </nav>

        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Free YouTube Thumbnail Downloader
          </h1>
          <p className="mx-auto max-w-2xl text-gray-400">
            Download high-quality thumbnails from any YouTube video. 
            CoverGrab pulls the highest resolution available (up to maxresdefault) 
            without any ads, popups, or signups.
          </p>
        </div>

        {/* Tool */}
        <div className="mb-12 rounded-2xl border border-gray-700/50 bg-gray-800/30 p-6 sm:p-8">
          <CoverTool compact />
        </div>

        {/* How to Use */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">How to Download a YouTube Thumbnail</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Copy Video URL",
                description: "Copy the YouTube video URL from your browser address bar or the Share button.",
              },
              {
                step: "2",
                title: "Paste & Get",
                description: 'Paste the URL above and click "Get Cover Art" to fetch the thumbnail.',
              },
              {
                step: "3",
                title: "Download",
                description: "Preview the thumbnail and click Download to save it to your device.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why CoverGrab */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Why Use CoverGrab for YouTube Thumbnails?</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "No Ads or Popups",
                description: "Unlike most thumbnail download sites, CoverGrab is completely ad-free. No popups, no redirects, no spam.",
                icon: "🚫",
              },
              {
                title: "Highest Quality Available",
                description: "We automatically try to fetch maxresdefault first, falling back to lower resolutions only if needed.",
                icon: "✨",
              },
              {
                title: "Thumbnails Only",
                description: "We only download thumbnails – no video or audio downloads. This keeps things simple, fast, and safe.",
                icon: "🖼️",
              },
              {
                title: "Works on Mobile",
                description: "Fully responsive design that works great on phones and tablets. Long-press the image to save directly.",
                icon: "📱",
              },
              {
                title: "No Account Required",
                description: "Just paste a link and go. No signup, no login, no email required.",
                icon: "👤",
              },
              {
                title: "Fast & Private",
                description: "All processing happens in your browser. We don't store your links or track your downloads.",
                icon: "⚡",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-xl border border-gray-700/50 bg-gray-800/30 p-5"
              >
                <div className="text-2xl">{item.icon}</div>
                <div>
                  <h3 className="mb-1 font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Supported URLs */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">Supported YouTube URL Formats</h2>
          <p className="mb-4 text-gray-400">
            CoverGrab accepts all standard YouTube video URL formats:
          </p>
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-5 font-mono text-sm">
            <div className="space-y-2">
              <p><span className="text-green-400">✓</span> https://www.youtube.com/watch?v=VIDEO_ID</p>
              <p><span className="text-green-400">✓</span> https://youtube.com/watch?v=VIDEO_ID</p>
              <p><span className="text-green-400">✓</span> https://youtu.be/VIDEO_ID</p>
              <p><span className="text-green-400">✓</span> https://m.youtube.com/watch?v=VIDEO_ID</p>
              <p><span className="text-green-400">✓</span> https://music.youtube.com/watch?v=VIDEO_ID</p>
            </div>
          </div>
        </section>

        {/* Thumbnail Quality */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold">YouTube Thumbnail Quality Levels</h2>
          <p className="mb-4 text-gray-400">
            YouTube stores thumbnails in multiple resolutions. CoverGrab automatically 
            fetches the highest quality available:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full rounded-xl border border-gray-700/50 bg-gray-800/30">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Quality</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Resolution</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-400">
                <tr className="border-b border-gray-700/50">
                  <td className="px-4 py-3">maxresdefault</td>
                  <td className="px-4 py-3">1280 × 720</td>
                  <td className="px-4 py-3 text-green-400">Best quality (when available)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="px-4 py-3">sddefault</td>
                  <td className="px-4 py-3">640 × 480</td>
                  <td className="px-4 py-3">Standard definition</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="px-4 py-3">hqdefault</td>
                  <td className="px-4 py-3">480 × 360</td>
                  <td className="px-4 py-3">High quality</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="px-4 py-3">mqdefault</td>
                  <td className="px-4 py-3">320 × 180</td>
                  <td className="px-4 py-3">Medium quality</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">default</td>
                  <td className="px-4 py-3">120 × 90</td>
                  <td className="px-4 py-3">Lowest quality</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-xl border border-gray-700/50 bg-gradient-to-r from-red-500/10 to-pink-600/10 p-6 text-center">
          <h2 className="mb-4 text-xl font-bold">Ready to Download Thumbnails?</h2>
          <p className="mb-4 text-gray-400">
            Scroll up and paste any YouTube link to get started – it's completely free!
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-600 hover:to-pink-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Go to Thumbnail Downloader
          </button>
        </section>

        {/* Related Links */}
        <section className="mt-10 border-t border-gray-800 pt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-400">Related Pages</h2>
          <ul className="space-y-2">
            <li>
              <Link
                to="/how-to-download-youtube-music-cover-art"
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                How to Download YouTube Music Cover Art
              </Link>
            </li>
            <li>
              <Link
                to="/faq"
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Frequently Asked Questions
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}
