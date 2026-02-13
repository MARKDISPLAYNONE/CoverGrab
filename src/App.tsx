import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { HomePage } from "./pages/HomePage";
import { HowToPage } from "./pages/HowToPage";
import { ThumbnailDownloaderPage } from "./pages/ThumbnailDownloaderPage";
import { FaqPage } from "./pages/FaqPage";
import { SupportPage } from "./pages/SupportPage";
import { SupportSuccessPage } from "./pages/SupportSuccessPage";
import { SupportCancelPage } from "./pages/SupportCancelPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminSecurityPage } from "./pages/AdminSecurityPage";

export function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AnalyticsProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/how-to-download-youtube-music-cover-art" element={<HowToPage />} />
            <Route path="/youtube-thumbnail-downloader" element={<ThumbnailDownloaderPage />} />
            <Route path="/faq" element={<FaqPage />} />
            
            {/* Support Routes */}
            <Route path="/support" element={<SupportPage />} />
            <Route path="/support/success" element={<SupportSuccessPage />} />
            <Route path="/support/cancel" element={<SupportCancelPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/security" element={<AdminSecurityPage />} />
            
            {/* Catch-all route redirects to home */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </AnalyticsProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
