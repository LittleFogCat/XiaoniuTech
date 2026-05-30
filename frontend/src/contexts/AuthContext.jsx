import { createContext, useContext, useEffect, useState } from 'react';
import { clearAuthSession, emitAuthChange, getAuthMode, isStoredLoggedIn } from '../services/authStorage';
import { AUTH_CHANGE_EVENT, fetchUserProfile, getUsernameFromToken, isLoggedIn } from '../services/blogApi';

const AuthContext = createContext(null);
const DEFAULT_AUTH_MODE = 'user';
const GUEST_AUTH_MODE = 'guest';

function readSessionState() {
  const authMode = getAuthMode() || DEFAULT_AUTH_MODE;
  const hasSession = isLoggedIn();
  const isGuestMode = authMode === GUEST_AUTH_MODE && isStoredLoggedIn() && !hasSession;

  return {
    authMode: isGuestMode ? GUEST_AUTH_MODE : DEFAULT_AUTH_MODE,
    hasSession,
    isGuestMode,
    isLoggedIn: hasSession || isGuestMode,
    username: hasSession ? getUsernameFromToken() : '',
  };
}

export function AuthProvider({ children }) {
  const [sessionState, setSessionState] = useState(() => readSessionState());
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(() => !readSessionState().hasSession);
  const [profileError, setProfileError] = useState('');
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    const syncSessionState = () => {
      setSessionState(readSessionState());
    };

    syncSessionState();
    window.addEventListener('focus', syncSessionState);
    window.addEventListener(AUTH_CHANGE_EVENT, syncSessionState);

    return () => {
      window.removeEventListener('focus', syncSessionState);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncSessionState);
    };
  }, []);

  useEffect(() => {
    if (!sessionState.hasSession) {
      setProfile(null);
      setProfileLoaded(true);
      setProfileError('');
      return;
    }

    let cancelled = false;
    setProfileLoaded(false);
    setProfileError('');

    fetchUserProfile()
      .then((user) => {
        if (cancelled) {
          return;
        }
        setProfile(user);
        setProfileLoaded(true);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setProfile(null);
        setProfileError(error.message || 'Failed to fetch profile');
        setProfileLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [profileVersion, sessionState.hasSession, sessionState.username]);

  function refreshProfile() {
    setProfileVersion((current) => current + 1);
  }

  function logout() {
    clearAuthSession();
    emitAuthChange();
  }

  return (
    <AuthContext.Provider
      value={{
        authMode: sessionState.authMode,
        hasSession: sessionState.hasSession,
        isGuestMode: sessionState.isGuestMode,
        isLoggedIn: sessionState.isLoggedIn,
        username: sessionState.username,
        profile,
        profileLoaded,
        profileError,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }

  return context;
}