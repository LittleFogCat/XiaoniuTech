import { useState, useRef, useEffect } from 'react';

const MIN_TEXTAREA_HEIGHT = 54;
const MAX_TEXTAREA_HEIGHT = 200;

export default function ChatInput({ onSend, disabled, layout = 'docked', autoFocus = false }) {
  const [input, setInput] = useState('');
  const [textareaHeight, setTextareaHeight] = useState(MIN_TEXTAREA_HEIGHT);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const nextHeight = Math.min(
        Math.max(textareaRef.current.scrollHeight, MIN_TEXTAREA_HEIGHT),
        MAX_TEXTAREA_HEIGHT
      );
      textareaRef.current.style.height = `${nextHeight}px`;
      setTextareaHeight(nextHeight);
    }
  }, [input]);

  useEffect(() => {
    if (!autoFocus || !textareaRef.current) {
      return;
    }

    const handle = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => cancelAnimationFrame(handle);
  }, [autoFocus]);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    }
    setTextareaHeight(MIN_TEXTAREA_HEIGHT);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isCentered = layout === 'centered';
  const isMultiline = textareaHeight > MIN_TEXTAREA_HEIGHT + 4;

  return (
    <div className={`w-full ${isCentered ? 'max-w-3xl' : 'max-w-5xl'}`}>
      <div className={`relative overflow-hidden rounded-[24px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(28,37,54,0.96),rgba(21,29,44,0.94))] shadow-[0_12px_26px_rgba(15,23,42,0.14)] transition duration-300 focus-within:border-sky-500/45 focus-within:shadow-[0_14px_34px_rgba(37,99,235,0.10)] sm:rounded-[28px] sm:shadow-[0_16px_34px_rgba(15,23,42,0.16)] sm:focus-within:shadow-[0_16px_40px_rgba(37,99,235,0.10)] ${isCentered ? 'backdrop-blur-xl' : ''}`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" />
        <div className={`relative flex gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5 ${isMultiline ? 'items-end' : 'items-center'}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none overflow-y-auto bg-transparent px-1.5 py-[11px] text-[15px] leading-6 text-slate-100 outline-none placeholder:text-slate-400/75 select-text touch-auto [-webkit-touch-callout:default] [-webkit-user-select:text] sm:px-3 sm:py-[14px] sm:text-base"
            style={{ minHeight: `${MIN_TEXTAREA_HEIGHT}px`, maxHeight: `${MAX_TEXTAREA_HEIGHT}px`, height: `${MIN_TEXTAREA_HEIGHT}px` }}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500 text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:border-slate-600/40 disabled:bg-slate-700/60 disabled:text-slate-400 sm:h-10 sm:w-10 sm:rounded-2xl ${isMultiline ? 'self-end' : 'self-center'}`}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" className="sm:h-[18px] sm:w-[18px]">
              <path d="M1.5 9l7.5-7.5v5.25h7.5v5.25h-7.5v5.25L1.5 9z" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400/80 sm:mt-3 sm:text-xs">
        AI 可能会产生错误信息，请核实重要内容
      </p>
    </div>
  );
}