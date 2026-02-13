import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/how-to-download-youtube-music-cover-art", label: "How It Works" },
    { path: "/youtube-thumbnail-downloader", label: "Thumbnail Downloader" },
    { path: "/faq", label: "FAQ" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-600 shadow-lg shadow-red-500/20 transition-transform group-hover:scale-105">
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">CoverGrab</h1>
                <p className="text-xs text-gray-400">YouTube Cover Art Downloader</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex flex-wrap gap-1 text-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    location.pathname === link.path
                      ? "bg-gray-700/50 text-white"
                      : "text-gray-400 hover:bg-gray-700/30 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900/50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            {/* Footer Logo */}
            <div className="flex items-center gap-2 text-gray-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-pink-600">
                <svg
                  className="h-4 w-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
              </div>
              <span className="font-semibold">CoverGrab</span>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link to="/how-to-download-youtube-music-cover-art" className="hover:text-white transition-colors">
                How It Works
              </Link>
              <Link to="/youtube-thumbnail-downloader" className="hover:text-white transition-colors">
                Thumbnail Downloader
              </Link>
              <Link to="/faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
            </div>
          </div>

          {/* Copyright & Disclaimer */}
          <div className="mt-6 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
            <p className="mb-2">
              © {new Date().getFullYear()} CoverGrab. All rights reserved.
            </p>
            <p>
              Images are property of their respective owners. This tool accesses publicly available thumbnails. For personal use only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
