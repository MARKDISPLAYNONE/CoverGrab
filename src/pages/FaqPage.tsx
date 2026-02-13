import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useState, useEffect } from "react";

interface FaqItem {
  question: string;
  answer: string | React.ReactNode;
}

const faqItems: FaqItem[] = [
  {
    question: "What is CoverGrab?",
    answer:
      "CoverGrab is a free, fast tool that lets you download cover art and thumbnails from YouTube and YouTube Music. Simply paste a video or track link, and we'll fetch the highest-quality thumbnail available for you to download.",
  },
  {
    question: "How do I use it with YouTube Music?",
    answer:
      "Open YouTube Music, find the track you want, click Share, and copy the link. Then paste that link into CoverGrab and click 'Get Cover Art'. The cover art displayed in YouTube Music is the same as the video thumbnail, so you'll get the album artwork.",
  },
  {
    question: "Does CoverGrab download videos or audio?",
    answer:
      "No. CoverGrab only downloads thumbnail images. We do not download, convert, or process any video or audio content. This keeps the tool simple, fast, and focused on one thing: getting cover art.",
  },
  {
    question: "Is this legal?",
    answer:
      "CoverGrab accesses publicly available thumbnail images that YouTube serves to anyone viewing a video. These images are meant for preview purposes. However, the images remain the property of their respective copyright owners. Please use downloaded images responsibly and in accordance with copyright law – typically for personal use, fair use, or with appropriate permissions.",
  },
  {
    question: "Is CoverGrab free?",
    answer:
      "Yes, CoverGrab is completely free to use. There are no hidden fees, premium tiers, or subscription required. No signup or account needed either.",
  },
  {
    question: "What YouTube links are supported?",
    answer: (
      <div>
        <p className="mb-2">CoverGrab supports all standard YouTube and YouTube Music video links:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>https://youtube.com/watch?v=...</li>
          <li>https://www.youtube.com/watch?v=...</li>
          <li>https://youtu.be/...</li>
          <li>https://m.youtube.com/watch?v=...</li>
          <li>https://music.youtube.com/watch?v=...</li>
        </ul>
      </div>
    ),
  },
  {
    question: "Why did my link not work?",
    answer: (
      <div>
        <p className="mb-2">There are a few reasons a link might not work:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>The video is private or deleted</li>
          <li>The link is to a playlist, channel, or non-video page</li>
          <li>The URL format isn't recognized (try using a standard watch link)</li>
          <li>The video doesn't have a standard thumbnail</li>
        </ul>
        <p className="mt-2">Make sure you're copying a link to a specific video or track, not a playlist or channel.</p>
      </div>
    ),
  },
  {
    question: "Does this work on mobile?",
    answer:
      "Yes! CoverGrab is fully responsive and works on phones and tablets. You can use the Download button, or long-press on the image preview to save it directly to your device's photo library.",
  },
  {
    question: "What image quality will I get?",
    answer:
      "CoverGrab automatically tries to fetch the highest resolution available, starting with maxresdefault (1280×720). If a higher resolution isn't available for a particular video, we fall back to lower resolutions. The resolution is displayed below the image preview.",
  },
  {
    question: "Do you collect any data?",
    answer:
      "We collect anonymous usage analytics to understand how people use CoverGrab and improve the service. This includes: page views, successful downloads, and error rates. We do NOT store the YouTube links you paste, any personal information, or use tracking cookies. IP addresses are hashed (not stored raw) and only used to estimate unique visitors and derive approximate country. No data is shared with third parties.",
  },
];

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-700/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
        aria-expanded={isOpen}
      >
        <h3 className="pr-4 font-semibold">{item.question}</h3>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-5 text-gray-400">
          {typeof item.answer === "string" ? <p>{item.answer}</p> : item.answer}
        </div>
      )}
    </div>
  );
}

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    document.title = "CoverGrab FAQ – YouTube & YouTube Music Cover Art Downloader";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Frequently asked questions about CoverGrab, the free YouTube and YouTube Music thumbnail downloader. Learn how it works, what links are supported, and more.'
      );
    }
    
    // Update canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', 'https://covergrab.netlify.app/faq');
    }
  }, []);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-300">FAQ</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            CoverGrab FAQ
          </h1>
          <p className="text-gray-400">
            Frequently asked questions about CoverGrab, the free YouTube and YouTube Music 
            cover art downloader. Can't find what you're looking for? The answer is probably here.
          </p>
        </div>

        {/* FAQ List */}
        <div className="mb-12 rounded-xl border border-gray-700/50 bg-gray-800/30 px-6">
          {faqItems.map((item, index) => (
            <FaqAccordion
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        {/* CTA */}
        <section className="rounded-xl border border-gray-700/50 bg-gradient-to-r from-red-500/10 to-pink-600/10 p-6 text-center">
          <h2 className="mb-4 text-xl font-bold">Ready to Download Cover Art?</h2>
          <p className="mb-4 text-gray-400">
            Head to the home page and paste any YouTube or YouTube Music link to get started.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-600 hover:to-pink-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to CoverGrab
          </Link>
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
                to="/youtube-thumbnail-downloader"
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                YouTube Thumbnail Downloader
              </Link>
            </li>
          </ul>
        </section>

        {/* Schema.org FAQ structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: typeof item.answer === "string" ? item.answer : "See our FAQ page for the full answer.",
                },
              })),
            }),
          }}
        />
      </div>
    </Layout>
  );
}
