import { useState, useRef, useEffect } from 'react';
import { useAppShell } from '../contexts/AppShellContext';

const TEXTAREA_LINE_HEIGHT = 24;
const TEXTAREA_VERTICAL_PADDING = 15;
const MIN_TEXTAREA_HEIGHT = TEXTAREA_LINE_HEIGHT + TEXTAREA_VERTICAL_PADDING * 2;
const MAX_TEXTAREA_HEIGHT = 200;

export default function ChatInput({ onSend, disabled, layout = 'docked', autoFocus = false }) {
  const { t } = useAppShell();
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
      <div className={`relative overflow-hidden rounded-[24px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] transition duration-300 focus-within:border-[color:var(--accent-border)] sm:rounded-[28px] ${isCentered ? 'backdrop-blur-xl' : ''}`}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/30 to-transparent" />
        <div className={`relative flex gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-4 sm:py-2.5 ${isMultiline ? 'items-end' : 'items-center'}`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.messagePlaceholder')}
            disabled={disabled}
            rows={1}
            className="w-full resize-none overflow-y-auto bg-transparent px-1.5 py-[15px] text-[15px] leading-6 text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-faint)] select-text touch-auto [-webkit-touch-callout:default] [-webkit-user-select:text] sm:px-3 sm:py-[15px] sm:text-base"
            style={{ minHeight: `${MIN_TEXTAREA_HEIGHT}px`, maxHeight: `${MAX_TEXTAREA_HEIGHT}px`, height: `${MIN_TEXTAREA_HEIGHT}px` }}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent bg-[var(--accent-solid)] text-[var(--accent-solid-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[var(--surface-hover)] disabled:text-[color:var(--text-faint)] sm:h-10 sm:w-10 sm:rounded-2xl ${isMultiline ? 'self-end' : 'self-center'}`}
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="currentColor" className="sm:h-[18px] sm:w-[18px]">
              <path d="M1.5 9l7.5-7.5v5.25h7.5v5.25h-7.5v5.25L1.5 9z" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[color:var(--text-faint)] sm:mt-3 sm:text-xs">
        {t('chat.importantNotice')}
      </p>
    </div>
  );
}