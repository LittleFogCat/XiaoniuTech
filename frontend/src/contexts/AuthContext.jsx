import { createContext, useContext, useEffect, useState } from 'react';
import {
  clearAuthSessionV2,
  emitAuthChange,
  getAuthMode,
  isStoredLoggedIn,
  migrateLegacyV1Token,
  setCachedUsername,
} from '../services/authStorage';
import { AUTH_CHANGE_EVENT, fetchUserProfile, getUsernameFromToken, isLoggedIn, logout as blogLogout } from '../services/blogApi';

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

const EMPTY_SESSION = {
  authMode: DEFAULT_AUTH_MODE,
  hasSession: false,
  isGuestMode: false,
  isLoggedIn: false,
  username: '',
};

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

  // One-shot legacy v1 token migration: if a v1 token is present without a
  // v2 session, try to validate it against /api/user/profile and cache the
  // username so the rest of the app keeps working. The v1 token is always
  // discarded afterwards (success or failure) — the next login will mint
  // a v2 session.
  useEffect(() => {
    migrateLegacyV1Token({ fetchProfile: fetchUserProfile }).finally(() => {
      // After migration attempt, refresh session state so the UI reflects
      // the cleared/cached storage.
      setSessionState(readSessionState());
      emitAuthChange();
    });
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
        // Keep the cached username fresh so subsequent renders don't need
        // to re-fetch the profile just to display it.
        if (user?.email) {
          setCachedUsername(user.email);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setProfile(null);
        setProfileError(error.message || 'Failed to fetch profile');
        setProfileLoaded(true);

        if (error.status === 401 || error.status === 403) {
          // httpClient already attempted a silent refresh; if we still got
          // 401/403 the refresh token is dead. Wipe v2 session and reset.
          clearAuthSessionV2();
          setSessionState(EMPTY_SESSION);
          emitAuthChange();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profileVersion, sessionState.hasSession, sessionState.username]);

  function refreshProfile() {
    setProfileVersion((current) => current + 1);
  }

  async function logout() {
    // blogLogout wraps logoutV2 (best-effort server revoke) + local clear.
    await blogLogout();
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