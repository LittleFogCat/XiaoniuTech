import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const actionLinks = [
  { label: '进入 Chat', to: '/chat', variant: 'primary', type: 'internal' },
  { label: '查看博客', to: 'https://www.jianshu.com/u/c8c42a7a2951', variant: 'secondary', type: 'external' },
  { label: 'Github', to: 'https://github.com/LittleFogCat', variant: 'secondary', type: 'external' },
];

const featureLinks = [
  { title: '博客', description: '技术笔记、想法整理和实践总结。', to: 'https://www.jianshu.com/u/c8c42a7a2951', type: 'external' },
  { title: 'Chat', description: 'AI 聊天工具入口，体验实时对话能力。', to: '/chat', type: 'internal' },
  { title: 'Github', description: '开源项目、代码仓库与持续更新。', to: 'https://github.com/LittleFogCat', type: 'external' },
  { title: '小游戏', description: '轻松有趣的小作品和实验玩法。（施工中）', to: '/games', type: 'internal' },
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
      <main className="home-page">
        <section className="hero">
          <div className="hero-layout">
            <div className="hero-main">
              <p className="eyebrow">Personal Hub</p>
              <h1>Xiaoniu Tech</h1>
              <p className="subtitle">个人主页与项目入口，快速进入我正在构建和维护的内容。</p>
              <div className="hero-actions">
                {actionLinks.map(item => (
                  <ActionLink key={item.label} item={item} className={`btn btn-${item.variant}`}>
                    {item.label}
                  </ActionLink>
                ))}
              </div>
            </div>

            <div className="contact-panel" aria-label="联系方式">
              <p className="contact-title">Contact</p>
              <div className="contact-list">
                <a className="contact-chip" href="mailto:littlefogcat@foxmail.com" aria-label="Mail: littlefogcat@foxmail.com" title="Mail: littlefogcat@foxmail.com">
                  <img className="contact-icon" src="/image/mail.svg" alt="" />
                </a>
                <a className="contact-chip qq-chip" href="tencent://message/?uin=475108923" aria-label="QQ: 475108923" title="QQ: 475108923">
                  <img className="contact-icon contact-icon-qq" src="/image/qq.svg" alt="" />
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
                  </button>
                  <div className={`wechat-popover${isWechatOpen ? ' is-open' : ''}`} aria-hidden={!isWechatOpen}>
                    <img src="/image/wechat_add.jpg" alt="微信添加二维码" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="link-grid" aria-label="站点入口">
          {featureLinks.map(item => (
            <ActionLink key={item.title} item={item} className="link-card">
              <h2>{item.title}</h2>
              <p>{item.description}</p>
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