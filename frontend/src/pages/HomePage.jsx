import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const actionLinks = [
  { label: '进入 Chat', to: '/chat', variant: 'primary', type: 'internal' },
  { label: '查看博客', to: '/blog', variant: 'secondary', type: 'internal' },
  { label: 'Github', to: 'https://github.com/LittleFogCat', variant: 'ghost', type: 'external' },
];

const featureLinks = [
  {
    title: 'Chat Lab',
    description: '多模型聊天与智能体入口。',
    to: '/chat',
    type: 'internal',
    tag: 'Product Surface',
  },
  {
    title: '技术博客',
    description: '工程记录与实践总结。',
    to: '/blog',
    type: 'internal',
    tag: 'Writing',
  },
  {
    title: 'Github 仓库',
    description: '开源项目与代码实验。',
    to: 'https://github.com/LittleFogCat',
    type: 'external',
    tag: 'Codebase',
  },
  {
    title: '小游戏',
    description: '轻量交互作品。',
    to: '/games',
    type: 'internal',
    tag: 'Sandbox',
  },
];

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
  const [isWechatOpen, setIsWechatOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    document.title = 'Xiaoniu Tech';
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

  return (
    <div className="home-page-shell">
      <div className="home-page-ambient home-page-ambient-a" />
      <div className="home-page-ambient home-page-ambient-b" />
      <div className="home-page-grid" />

      <main className="home-page">
        <section className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">Product · Code · AI</p>
            <h1>做简洁、好用、持续进化的数字产品。</h1>
            <p className="subtitle">这里是我的项目入口与实验主页。</p>

            <div className="hero-actions">
              {actionLinks.map(item => (
                <ActionLink key={item.label} item={item} className={`btn btn-${item.variant}`}>
                  {item.label}
                </ActionLink>
              ))}
            </div>
          </div>

          <div className="hero-side">
            <div className="contact-panel" aria-label="联系方式">
              <div className="contact-head">
                <div className="contact-copy">
                  <p className="contact-title">Direct Channel</p>
                  <p className="contact-text">欢迎交流合作或想法。</p>
                </div>
                <span className="contact-badge">Available</span>
              </div>

              <div className="contact-meta">
                <span className="contact-meta-label">邮箱</span>
                <a className="contact-meta-value" href="mailto:littlefogcat@foxmail.com">
                  littlefogcat@foxmail.com
                </a>
              </div>

              <div className="contact-list">
                <a className="contact-chip" href="mailto:littlefogcat@foxmail.com" aria-label="Mail: littlefogcat@foxmail.com" title="Mail: littlefogcat@foxmail.com">
                  <img className="contact-icon" src="/image/mail.svg" alt="" />
                  <span className="contact-chip-text">Email</span>
                </a>
                <a className="contact-chip qq-chip" href="tencent://message/?uin=475108923" aria-label="QQ: 475108923" title="QQ: 475108923">
                  <img className="contact-icon contact-icon-qq" src="/image/qq.svg" alt="" />
                  <span className="contact-chip-text">QQ</span>
                </a>
                <div ref={popoverRef} className="wechat-popover-wrap">
                  <button
                    className="contact-chip contact-chip-button"
                    type="button"
                    aria-label="微信号: lgfpbwqlbwbxnll"
                    aria-expanded={isWechatOpen}
                    title="微信号: lgfpbwqlbwbxnll"
                    onClick={() => setIsWechatOpen(open => !open)}
                  >
                    <img className="contact-icon" src="/image/wechat.svg" alt="" />
                    <span className="contact-chip-text">微信</span>
                  </button>
                  <div className={`wechat-popover${isWechatOpen ? ' is-open' : ''}`} aria-hidden={!isWechatOpen}>
                    <img src="/image/wechat_add.jpg" alt="微信添加二维码" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-grid" aria-label="站点入口">
          {featureLinks.map(item => (
            <ActionLink key={item.title} item={item} className="link-card">
              <span className="link-tag">{item.tag}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span className="link-arrow">Open</span>
            </ActionLink>
          ))}
        </section>
      </main>

      <footer className="site-footer">
        <p>Built by LittleFogCat</p>
      </footer>
    </div>
  );
}