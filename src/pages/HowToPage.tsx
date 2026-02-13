import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useEffect } from "react";

export function HowToPage() {
  useEffect(() => {
    document.title = "How to Download YouTube Music Cover Art – CoverGrab Guide";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Learn how to download YouTube Music cover art and album artwork in seconds. Step-by-step guide to getting high-quality thumbnails from any YouTube Music track.'
      );
    }
    
    // Update canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://covergrab.netlify.app/how-to-download-youtube-music-cover-art');
    }
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">How to Download YouTube Music Cover Art</span>
        </nav>

        {/* Main Content */}
        <article>
          <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            How to Download YouTube Music Cover Art
          </h1>

          {/* Introduction */}
          <div className="mb-8 text-gray-300">
            <p className="mb-4">
              YouTube Music displays beautiful album artwork for every track you listen to. 
              This cover art is actually stored as a standard YouTube thumbnail – but getting 
              your hands on a high-quality version isn't straightforward.
            </p>
            <p>
              Instead of screenshotting the player (which gives you low resolution and includes 
              UI elements), CoverGrab lets you download the original, full-quality artwork 
              directly. Here's how:
            </p>
          </div>

          {/* Step by Step Guide */}
          <section className="mb-10">
            <h2 className="mb-6 text-2xl font-bold">Step-by-Step Guide</h2>
            
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: "Open YouTube Music and find your track",
                  description: "Navigate to the song or track whose cover art you want to download. This works with any track that has a dedicated YouTube Music page.",
                },
                {
                  step: 2,
                  title: "Copy the track's URL",
                  description: 'Click the Share button (or right-click the track) and select "Copy link". The URL should look something like: https://music.youtube.com/watch?v=...',
                },
                {
                  step: 3,
                  title: "Go to CoverGrab",
                  description: "Open CoverGrab in your browser. You can bookmark it for quick access next time.",
                },
                {
                  step: 4,
                  title: "Paste the link and click Get Cover Art",
                  description: "Paste your copied URL into the input field and click the \"Get Cover Art\" button. CoverGrab will automatically find the highest resolution version available.",
                },
                {
                  step: 5,
                  title: "Download the cover art",
                  description: 'Once the artwork appears, click the "Download" button to save it to your device. On mobile, you can also long-press the image to save it directly.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-xl border border-gray-700/50 bg-gray-800/30 p-5"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-lg font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="mb-2 font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Why Better Than Screenshots */}
          <section className="mb-10">
            <h2 className="mb-6 text-2xl font-bold">Why This Is Better Than Screenshots</h2>
            
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Higher Resolution",
                  description: "Get up to 1280×720 or higher resolution, versus a cropped screen capture.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  ),
                },
                {
                  title: "No UI Elements",
                  description: "Clean image without play buttons, progress bars, or other player interface.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  title: "Consistent Quality",
                  description: "Always get the best available quality, regardless of your screen size.",
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-5 text-center"
                >
                  <div className="mb-3 flex justify-center text-red-400">
                    {item.icon}
                  </div>
                  <h3 className="mb-2 font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Supported Link Types */}
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold">Supported YouTube Music Links</h2>
            <p className="mb-4 text-gray-400">
              CoverGrab works with all standard YouTube Music track URLs:
            </p>
            <div className="space-y-2 rounded-xl border border-gray-700/50 bg-gray-800/30 p-5">
              <code className="block text-sm text-green-400">https://music.youtube.com/watch?v=VIDEO_ID</code>
              <code className="block text-sm text-green-400">https://music.youtube.com/watch?v=VIDEO_ID&si=...</code>
              <code className="block text-sm text-gray-400">// Also works with regular YouTube links:</code>
              <code className="block text-sm text-green-400">https://youtube.com/watch?v=VIDEO_ID</code>
              <code className="block text-sm text-green-400">https://youtu.be/VIDEO_ID</code>
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-xl border border-gray-700/50 bg-gradient-to-r from-red-500/10 to-pink-600/10 p-6 text-center">
            <h2 className="mb-4 text-xl font-bold">Ready to Grab Cover Art?</h2>
            <p className="mb-4 text-gray-400">
              Try the YouTube Music cover downloader now – it's free and takes just seconds.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-600 hover:to-pink-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Use the Cover Art Downloader
            </Link>
          </section>

          {/* Related Links */}
          <section className="mt-10 border-t border-gray-800 pt-8">
            <h2 className="mb-4 text-lg font-semibold text-gray-400">Related Pages</h2>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/youtube-thumbnail-downloader"
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  YouTube Thumbnail Downloader
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
        </article>
      </div>
    </Layout>
  );
}
