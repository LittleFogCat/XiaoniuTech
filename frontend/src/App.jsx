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
import UserHomePage from './pages/UserHomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/games"
          element={<PlaceholderPage title="小游戏" description="暂未开放，敬请期待。" />}
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
  );
}