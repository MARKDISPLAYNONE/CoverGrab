import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { CoverTool } from "../components/CoverTool";

export function HomePage() {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Download YouTube & YouTube Music Cover Art Instantly
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            CoverGrab is a free, fast YouTube and YouTube Music thumbnail downloader.
            Paste any video or track link, get the highest-quality cover art, and download it in seconds.
            No login, no ads, no clutter.
          </p>
        </div>

        {/* Tool Section */}
        <div className="mb-16 rounded-2xl border border-gray-700/50 bg-gray-800/30 p-6 sm:p-8">
          <CoverTool />
        </div>

        {/* SEO Content Section 1: How it Works */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">How This YouTube Cover Art Downloader Works</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Copy a Link",
                description: "Copy a YouTube or YouTube Music link from your browser or app.",
              },
              {
                step: "2",
                title: "Paste & Click",
                description: 'Paste the link into CoverGrab and click "Get Cover Art".',
              },
              {
                step: "3",
                title: "We Fetch the Best",
                description: "We detect the video ID and fetch the highest-quality thumbnail available.",
              },
              {
                step: "4",
                title: "Download",
                description: 'Preview the artwork, then click "Download" to save it.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-gray-400">
            Most official tracks on YouTube Music use the album cover as their thumbnail, 
            so you get the same artwork you see in the player.
          </p>
        </section>

        {/* SEO Content Section 2: Use Cases */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">What You Can Do With YouTube Cover Art</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                ),
                title: "Local Music Library",
                description: "Add proper album artwork to your local music files and MP3 collections.",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
                title: "Playlist Covers",
                description: "Create custom playlist covers or mood boards with your favorite track artwork.",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                ),
                title: "Design & Content",
                description: "Use thumbnails as references for design, content creation, and inspiration.",
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
                title: "Fan Art & Inspiration",
                description: "Save fan art or visual inspiration from your favorite tracks and artists.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-xl border border-gray-700/50 bg-gray-800/30 p-5"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-700/50 text-red-400">
                  {item.icon}
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-gray-400">
            CoverGrab focuses on being fast and simple: paste, click, download, done.
          </p>
        </section>

        {/* SEO Content Section 3: Internal Links */}
        <section className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-6">
          <h2 className="mb-4 text-xl font-bold">Learn More</h2>
          <ul className="space-y-3">
            <li>
              <Link
                to="/how-to-download-youtube-music-cover-art"
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                How to Download YouTube Music Cover Art
              </Link>
            </li>
            <li>
              <Link
                to="/youtube-thumbnail-downloader"
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Using CoverGrab as a YouTube Thumbnail Downloader
              </Link>
            </li>
            <li>
              <Link
                to="/faq"
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Frequently Asked Questions
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </Layout>
  );
}
