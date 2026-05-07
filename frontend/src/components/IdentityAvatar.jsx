import { useAppShell } from '../contexts/AppShellContext';

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
};

function getInitial(name = 'AI') {
  const normalized = String(name).trim();
  return Array.from(normalized)[0] || 'A';
}

export default function IdentityAvatar({ name = 'AI', avatarUrl = '', size = 'md', className = '' }) {
  const { t } = useAppShell();
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (avatarUrl) {
    return (
      <div className={`overflow-hidden rounded-2xl ring-1 ring-white/10 ${sizeClass} ${className}`}>
        <img
          src={avatarUrl}
          alt={t('chat.assistantAvatarAlt', { name })}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#38bdf8_0%,#6366f1_52%,#22c55e_100%)] font-semibold text-white shadow-[0_14px_30px_rgba(34,197,94,0.18)] ${sizeClass} ${className}`}
      aria-label={t('chat.assistantFallbackAvatarAlt', { name })}
    >
      {getInitial(name)}
    </div>
  );
}