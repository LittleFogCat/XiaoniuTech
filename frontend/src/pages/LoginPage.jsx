import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Login from '../components/Login';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    document.title = '登录 - XN';
  }, []);

  function handleLogin() {
    navigate(redirect, { replace: true });
  }

  function handleBack() {
    navigate(-1);
  }

  return <Login onLogin={handleLogin} onBack={handleBack} />;
}
