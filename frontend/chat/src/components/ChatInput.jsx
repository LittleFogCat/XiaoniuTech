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
    <div className="bg-[#343541] pb-6">
      <div className="max-w-3xl mx-auto pt-4 px-5">
        <div className="relative flex items-center bg-[#202123] rounded-2xl border border-[#4e4f56] focus-within:border-[#19c37d] shadow-lg">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent px-5 py-3 pr-14 text-[#ececf1] placeholder-[#8e8ea0] resize-none outline-none overflow-y-auto"
            style={{ minHeight: '56px', maxHeight: '240px', height: '56px', lineHeight: '1.5' }}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#19c37d] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M1.5 9l7.5-7.5v5.25h7.5v5.25h-7.5v5.25L1.5 9z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[#8e8ea0] text-xs mt-3">
          AI 可能会产生错误信息，请核实重要内容
        </p>
      </div>
    </div>
  );
}