import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import IdentityAvatar from './IdentityAvatar';

export default function ChatMessage({ role, content, onRegenerate, isThinking = false, assistantName = 'AI 助手', assistantAvatarUrl = '' }) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-center px-3 py-3 sm:px-4 sm:py-4">
      <div className={`mx-auto flex w-full max-w-5xl ${isUser ? 'justify-end' : 'items-start'}`}>
        {isUser ? (
          <div className="max-w-[92%] break-words rounded-[26px] border border-sky-500/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.24),rgba(30,41,59,0.96))] px-4 py-3 text-white shadow-[0_10px_24px_rgba(30,64,175,0.14)] sm:max-w-[72%] sm:px-5 sm:py-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
              <span>Me</span>
            </div>
            <div className="prose prose-invert max-w-none select-text touch-auto text-[15px] leading-relaxed [-webkit-touch-callout:default] [-webkit-user-select:text] sm:text-base sm:leading-loose sm:tracking-wide">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
          </div>
        ) : (
          <div className="min-w-0 w-full flex-1 break-words rounded-[28px] border border-slate-700/60 bg-[linear-gradient(180deg,rgba(30,41,59,0.52),rgba(15,23,42,0.58))] px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.16)] backdrop-blur-md sm:px-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <IdentityAvatar name={assistantName} avatarUrl={assistantAvatarUrl} size="sm" className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200/70">Assistant</div>
                    <div className="mt-1 truncate text-sm font-medium text-white">{assistantName}</div>
                  </div>
                </div>
                {isThinking ? (
                  <span className="shrink-0 rounded-full border border-slate-600/60 bg-slate-700/35 px-2.5 py-1 text-[11px] text-slate-300/80">
                    正在思考
                  </span>
                ) : null}
              </div>
              <div className="text-[#ececf1]">
                {isThinking ? (
                  <div className="flex h-7 items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-200/75 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-slate-300/60 animate-pulse [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-slate-400/60 animate-pulse [animation-delay:300ms]" />
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none select-text touch-auto text-[15px] leading-relaxed [-webkit-touch-callout:default] [-webkit-user-select:text] sm:text-base sm:leading-loose sm:tracking-wide">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {!isThinking && <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-800/35 px-3 py-1.5 text-xs text-slate-200/85 transition hover:border-sky-500/25 hover:bg-sky-500/10"
                >
                  {copied ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  )}
                  {copied ? '已复制' : '复制'}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-800/35 px-3 py-1.5 text-xs text-slate-200/85 transition hover:border-sky-500/25 hover:bg-sky-500/10"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M7 1v3M7 1a6 6 0 106 6h-3M7 13v-3M7 13a6 6 0 10-6-6h3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                    重新生成
                  </button>
                )}
              </div>}
            </div>
        )}
      </div>
    </div>
  );
}