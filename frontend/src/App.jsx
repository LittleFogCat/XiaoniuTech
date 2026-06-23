import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import PlaceholderPage from './pages/PlaceholderPage';
import BlogListPage from './pages/BlogListPage';
import BlogPostPage from './pages/BlogPostPage';
import BlogEditorPage from './pages/BlogEditorPage';
import BlogManagePage from './pages/BlogManagePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ChatManagePage from './pages/ChatManagePage';
import PermissionManagePage from './pages/PermissionManagePage';
import StatisticsPage from './pages/StatisticsPage';
import UserHomePage from './pages/UserHomePage';
import StockReviewPage from './pages/StockReviewPage';
import StockReviewDetailPage from './pages/StockReviewDetailPage';
import ApiKeyPage from './pages/ApiKeyPage';
import { AppShellProvider } from './contexts/AppShellContext';
import { AuthProvider } from './contexts/AuthContext';
import StatisticsTracker from './components/StatisticsTracker';

export default function App() {
  return (
    <AppShellProvider>
      <AuthProvider>
        <BrowserRouter>
          <StatisticsTracker />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/chat/manage" element={<ChatManagePage />} />
            <Route path="/permission" element={<Navigate to="/permissions" replace />} />
            <Route path="/permissions" element={<PermissionManagePage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/stock/review" element={<StockReviewPage />} />
            <Route path="/stock/review/new" element={<StockReviewDetailPage />} />
            <Route path="/stock/review/:reviewId" element={<StockReviewDetailPage />} />
            <Route path="/api-key" element={<ApiKeyPage />} />
            <Route
              path="/games"
              element={<PlaceholderPage titleKey="placeholder.gamesTitle" descriptionKey="placeholder.gamesDescription" />}
            />
            <Route path="/blog/post/:slug" element={<BlogPostPage />} />
            <Route path="/blog/new" element={<BlogEditorPage />} />
            <Route path="/blog/edit/:slug" element={<BlogEditorPage />} />
            <Route path="/blog/manage" element={<BlogManagePage />} />
            <Route path="/blog/:nickname" element={<UserHomePage />} />
            <Route path="/blog" element={<UserHomePage nickname="XiaoNiu" />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppShellProvider>
  );
}