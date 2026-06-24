import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageThemeControls from '../components/LanguageThemeControls';
import UserAccountMenu from '../components/UserAccountMenu';
import { useAppShell } from '../contexts/AppShellContext';
import usePageSeo from '../hooks/usePageSeo';
import { isLoggedIn as hasAuthenticatedSession } from '../services/blogApi';
import './HomePage.css';

function ActionLink({ item, children, className }) {
  if (item.type === 'internal') {
    return <Link className={className} to={item.to}>{children}</Link>;
  }

  return (
    <a className={className} href={item.to} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export default function HomePage() {
  const { t, theme } = useAppShell();
  const siteOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const [isWechatOpen, setIsWechatOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasAccountSession, setHasAccountSession] = useState(() => hasAuthenticatedSession());
  const [orbitBursts, setOrbitBursts] = useState([]);
  const [orbitComets, setOrbitComets] = useState([]);
  const [isSupernovaActive, setIsSupernovaActive] = useState(false);
  const popoverRef = useRef(null);
  const burstTimersRef = useRef(new Map());
  const cometTimersRef = useRef(new Map());
  const supernovaTimerRef = useRef(null);
  const hoverBurstThrottleRef = useRef(0);

  usePageSeo({
    title: `首页 - ${t('common.siteName')}`,
    description: t('home.heroSubtitle'),
    canonicalPath: '/',
    image: '/image/niu.jpg',
    jsonLd: siteOrigin
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: t('common.siteName'),
          url: `${siteOrigin}/`,
        }
      : null,
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const syncSession = () => setHasAccountSession(hasAuthenticatedSession());
    syncSession();
    window.addEventListener('focus', syncSession);
    return () => window.removeEventListener('focus', syncSession);
  }, []);

  useEffect(() => () => {
    burstTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    burstTimersRef.current.clear();
    cometTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    cometTimersRef.current.clear();
    window.clearTimeout(supernovaTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isWechatOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsWechatOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsWechatOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWechatOpen]);

  const actionLinks = [
    { label: t('home.actionChat'), to: '/chat', variant: 'primary', type: 'internal' },
    { label: t('home.actionBlog'), to: '/blog', variant: 'secondary', type: 'internal' },
    { label: t('home.actionGithub'), to: 'https://github.com/LittleFogCat', variant: 'ghost', type: 'external' },
  ];

  const orbitEventDurationMs = theme === 'dark' ? 5000 : 3000;

  const featureLinks = [
    {
      title: t('home.featureChatTitle'),
      description: t('home.featureChatDesc'),
      to: '/chat',
      type: 'internal',
      tag: t('home.featureTagProduct'),
    },
    {
      title: t('home.featureBlogTitle'),
      description: t('home.featureBlogDesc'),
      to: '/blog',
      type: 'internal',
      tag: t('home.featureTagWriting'),
    },
    {
      title: t('home.featureGithubTitle'),
      description: t('home.featureGithubDesc'),
      to: 'https://github.com/LittleFogCat',
      type: 'external',
      tag: t('home.featureTagCode'),
    },
    {
      title: t('home.featureGamesTitle'),
      description: t('home.featureGamesDesc'),
      to: '/games',
      type: 'internal',
      tag: t('home.featureTagSandbox'),
    },
    {
      title: t('home.featureStockTitle'),
      description: t('home.featureStockDesc'),
      to: '/stock/review',
      type: 'internal',
      tag: t('home.featureTagMarkets'),
    },
  ];

  const statusRows = [
    { label: t('home.statusOneLabel'), value: t('home.statusOneValue') },
    { label: t('home.statusTwoLabel'), value: t('home.statusTwoValue') },
  ];

  const spawnOrbitBurst = (x, y) => {
    const burstId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const colors = ['#fde68a', '#fb923c', '#fef3c7', '#67e8f9', '#f9a8d4'];
    const particles = Array.from({ length: 9 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 9 + Math.random() * 0.38;
      const distance = 18 + Math.random() * 34;
      return {
        id: `${burstId}_${index}`,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        size: 5 + Math.random() * 5,
        color: colors[index % colors.length],
        duration: 560 + Math.round(Math.random() * 260),
      };
    });

    setOrbitBursts((previous) => [...previous, { id: burstId, x, y, particles }]);

    const timerId = window.setTimeout(() => {
      setOrbitBursts((previous) => previous.filter((item) => item.id !== burstId));
      burstTimersRef.current.delete(burstId);
    }, 900);

    burstTimersRef.current.set(burstId, timerId);
  };

  const spawnOrbitComet = (x, y) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const angle = Math.random() * Math.PI * 2;
    const distance = 100;
    const comet = {
      id,
      x,
      y,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rotation: `${(angle * 180) / Math.PI}deg`,
      length: `${92 + Math.round(Math.random() * 18)}px`,
    };

    setOrbitComets((previous) => [...previous, comet]);

    const timerId = window.setTimeout(() => {
      setOrbitComets((previous) => previous.filter((item) => item.id !== id));
      cometTimersRef.current.delete(id);
    }, 820);

    cometTimersRef.current.set(id, timerId);
  };

  const handleOrbitCardClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    spawnOrbitComet(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handleOrbitCardKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    spawnOrbitComet(rect.width * 0.52, rect.height * 0.38);
  };

  const handleOrbitPointerMove = (event) => {
    const now = Date.now();
    if (now - hoverBurstThrottleRef.current < 96) {
      return;
    }

    hoverBurstThrottleRef.current = now;
    const rect = event.currentTarget.getBoundingClientRect();
    spawnOrbitBurst(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handleOrbitPointerEnter = (event) => {
    hoverBurstThrottleRef.current = 0;
    handleOrbitPointerMove(event);
  };

  const handleOrbitCenterClick = (event) => {
    event.stopPropagation();
    setIsSupernovaActive(true);
    window.clearTimeout(supernovaTimerRef.current);
    supernovaTimerRef.current = window.setTimeout(() => {
      setIsSupernovaActive(false);
    }, orbitEventDurationMs);
  };

  return (
    <div className="home-page-shell">
      <div className="home-page-ambient home-page-ambient-a" />
      <div className="home-page-ambient home-page-ambient-b" />
      <div className="home-page-grid" />

      <header className={`home-page-header${isScrolled ? ' is-scrolled' : ''}`}>
        <div className="home-page-header-inner">
          <Link className="home-logo" to="/">
            {t('home.navTitle')}
          </Link>

          <div className="home-header-actions">
            <LanguageThemeControls />
            {hasAccountSession ? (
              <UserAccountMenu onLogout={() => setHasAccountSession(false)} />
            ) : (
              <Link className="home-nav-button home-nav-button-primary" to="/login">
                {t('common.loginOrRegister')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="home-page-main">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="hero-kicker hero-display-lock">{t('home.heroKicker')}</p>
            <h1 className="hero-display-lock">{t('home.heroTitle')}</h1>
            <p className="subtitle">{t('home.heroSubtitle')}</p>

            <div className="hero-actions">
              {actionLinks.map(item => (
                <ActionLink key={item.label} item={item} className={`btn btn-${item.variant}`}>
                  {item.label}
                </ActionLink>
              ))}
            </div>
          </div>

          <div className="hero-status-panel">
            <div className="status-panel-head">
              <span className="status-badge">{t('home.statusTitle')}</span>
              <span className="status-pulse" aria-hidden="true" />
            </div>

            <div className="status-list">
              {statusRows.map(item => (
                <div key={item.label} className="status-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div
              className={`hero-orbit-card${isSupernovaActive ? ' is-supernova' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={t('home.orbitCardHint')}
              onClick={handleOrbitCardClick}
              onKeyDown={handleOrbitCardKeyDown}
              onPointerEnter={handleOrbitPointerEnter}
              onPointerMove={handleOrbitPointerMove}
            >
              <div className="hero-orbit-grid" />
              <div className="hero-orbit-aura" />
              <div className="hero-orbit-supernova" />
              <div className="hero-orbit-ring hero-orbit-ring-a" />
              <div className="hero-orbit-ring hero-orbit-ring-b" />
              <div className="hero-orbit-orbiter hero-orbit-orbiter-a">
                <div className="hero-orbit-dot hero-orbit-dot-a" />
              </div>
              <div className="hero-orbit-orbiter hero-orbit-orbiter-b">
                <div className="hero-orbit-dot hero-orbit-dot-b" />
              </div>
              <div className="hero-orbit-orbiter hero-orbit-orbiter-c">
                <div className="hero-orbit-dot hero-orbit-dot-c" />
              </div>
              <button
                type="button"
                className="hero-orbit-center"
                onClick={handleOrbitCenterClick}
                title={t('home.orbitSunTitle')}
                aria-label={t('home.orbitSunTitle')}
              >
                <span className="hero-orbit-core" />
              </button>
              {orbitBursts.map((burst) => (
                <span
                  key={burst.id}
                  className="hero-orbit-burst"
                  style={{
                    '--burst-x': `${burst.x}px`,
                    '--burst-y': `${burst.y}px`,
                  }}
                >
                  {burst.particles.map((particle) => (
                    <span
                      key={particle.id}
                      className="hero-orbit-particle"
                      style={{
                        '--particle-dx': `${particle.dx}px`,
                        '--particle-dy': `${particle.dy}px`,
                        '--particle-size': `${particle.size}px`,
                        '--particle-color': particle.color,
                        '--particle-duration': `${particle.duration}ms`,
                      }}
                    />
                  ))}
                </span>
              ))}
              {orbitComets.map(comet => (
                <span
                  key={comet.id}
                  className="hero-orbit-comet"
                  style={{
                    '--comet-x': `${comet.x}px`,
                    '--comet-y': `${comet.y}px`,
                    '--comet-dx': `${comet.dx}px`,
                    '--comet-dy': `${comet.dy}px`,
                    '--comet-rotate': comet.rotation,
                    '--comet-length': comet.length,
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="surface-grid" aria-label={t('home.navTitle')}>
          {featureLinks.map(item => (
            <ActionLink key={item.title} item={item} className="link-card">
              <span className="link-tag">{item.tag}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span className="link-arrow">{t('home.open')}</span>
            </ActionLink>
          ))}
        </section>
      </main>

      <footer className="site-footer">
        <p>{t('home.footerBuiltBy')}</p>
        <div className="footer-contact-row">
          <a className="footer-icon-link" href="mailto:littlefogcat@foxmail.com" aria-label={t('home.footerEmail')} title={t('home.footerEmail')}>
            <img className="contact-icon" src="/image/mail.svg" alt="" />
          </a>
          <a className="footer-icon-link" href="https://github.com/LittleFogCat" target="_blank" rel="noopener noreferrer" aria-label={t('home.footerGithub')} title={t('home.footerGithub')}>
            <img className="contact-icon" src="/image/github.svg" alt="" />
          </a>
          <a className="footer-icon-link" href="tencent://message/?uin=475108923" aria-label={t('home.footerQQ')} title={t('home.footerQQ')}>
            <img className="contact-icon contact-icon-qq" src="/image/qq.svg" alt="" />
          </a>
          <div ref={popoverRef} className="wechat-popover-wrap">
            <button
              className="footer-icon-link footer-icon-button"
              type="button"
              aria-label={t('home.footerWechat')}
              aria-expanded={isWechatOpen}
              title={t('home.footerWechat')}
              onClick={() => setIsWechatOpen(open => !open)}
            >
              <img className="contact-icon" src="/image/wechat.svg" alt="" />
            </button>
            <div className={`wechat-popover${isWechatOpen ? ' is-open' : ''}`} aria-hidden={!isWechatOpen}>
              <img src="/image/wechat_add.jpg" alt={t('home.footerWechatQrAlt')} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}