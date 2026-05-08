import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Login from '../components/Login';
import { useAppShell } from '../contexts/AppShellContext';
import usePageSeo from '../hooks/usePageSeo';

export default function LoginPage() {
  const { t } = useAppShell();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  usePageSeo({
    title: `登录 / 注册 - ${t('common.siteName')}`,
    description: '邮箱登录、注册、验证码验证与游客入口。',
    robots: 'noindex, nofollow',
  });

  function handleLogin() {
    navigate(redirect, { replace: true });
  }

  function handleBack() {
    navigate(-1);
  }

  return <Login onLogin={handleLogin} onBack={handleBack} initialMode={initialMode} />;
}
