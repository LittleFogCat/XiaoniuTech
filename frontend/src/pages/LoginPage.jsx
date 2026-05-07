import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Login from '../components/Login';
import { useAppShell } from '../contexts/AppShellContext';

export default function LoginPage() {
  const { t } = useAppShell();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  useEffect(() => {
    document.title = t('login.pageTitle');
  }, [t]);

  function handleLogin() {
    navigate(redirect, { replace: true });
  }

  function handleBack() {
    navigate(-1);
  }

  return <Login onLogin={handleLogin} onBack={handleBack} initialMode={initialMode} />;
}
