import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

export default function ChatMessage({ role, content, onRegenerate, isThinking = false }) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-center py-4">
      <div className="w-full max-w-3xl mx-auto" style={{ maxWidth: '85%' }}>
        {isUser ? (
          <div className="flex justify-end">
            <div className="bg-[#19c37d] text-white rounded-2xl px-5 py-3 shadow-sm break-words" style={{ maxWidth: '67%' }}>
              <div className="prose prose-invert max-w-none text-base leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="break-words">
            <div className="text-[#ececf1]">
              {isThinking ? (
                <div className="flex items-center gap-2 h-7">
                  <span className="w-2 h-2 rounded-full bg-[#b4b4c3] animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-[#b4b4c3] animate-pulse [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-[#b4b4c3] animate-pulse [animation-delay:300ms]" />
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-base leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            {!isThinking && <div className="flex gap-3 mt-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-[#8e8ea0] hover:text-[#ececf1] transition-colors"
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
                  className="flex items-center gap-1 text-xs text-[#8e8ea0] hover:text-[#ececf1] transition-colors"
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