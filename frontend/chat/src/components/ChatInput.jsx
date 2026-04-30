import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 240) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-[#343541] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-6">
      <div className="mx-auto max-w-4xl px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="relative flex items-center rounded-[1.25rem] border border-[#4e4f56] bg-[#202123] shadow-lg focus-within:border-[#19c37d]">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none overflow-y-auto bg-transparent px-4 py-3 pr-12 text-sm text-[#ececf1] outline-none placeholder-[#8e8ea0] sm:px-5 sm:pr-14 sm:text-base"
            style={{ minHeight: '56px', maxHeight: '240px', height: '56px', lineHeight: '1.5' }}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#19c37d] p-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:right-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M1.5 9l7.5-7.5v5.25h7.5v5.25h-7.5v5.25L1.5 9z" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-[#8e8ea0]">
          AI 可能会产生错误信息，请核实重要内容
        </p>
      </div>
    </div>
  );
}