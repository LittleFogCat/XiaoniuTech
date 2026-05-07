import * as Select from '@radix-ui/react-select';
import { useAppShell } from '../contexts/AppShellContext';

export default function ModelSelect({ models, value, onChange }) {
  const { t } = useAppShell();

  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] px-3 text-left text-sm font-medium text-[color:var(--text-primary)] shadow-[var(--surface-shadow)] outline-none transition hover:bg-[var(--surface-hover)] focus:border-[color:var(--accent-border)] data-[placeholder]:text-[color:var(--text-faint)] sm:h-11 sm:min-w-[235px] sm:px-4">
        <Select.Value className="truncate" placeholder={t('chat.modelPlaceholder')} />
        <Select.Icon className="shrink-0 text-[color:var(--text-faint)] transition group-data-[state=open]:text-[color:var(--accent-solid)]">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 4.5L6 8L9.5 4.5" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(92vw,30rem)] overflow-hidden rounded-[22px] border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] shadow-[var(--surface-shadow)] backdrop-blur-xl"
        >
          <Select.Viewport className="p-2">
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="relative flex min-h-11 cursor-pointer select-none items-center gap-3 whitespace-nowrap rounded-2xl px-3 py-2.5 text-sm text-[color:var(--text-secondary)] outline-none transition data-[highlighted]:bg-[var(--accent-soft)] data-[highlighted]:text-[color:var(--text-primary)] data-[state=checked]:bg-[var(--accent-soft)] sm:px-4"
              >
                <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-solid)]">
                  {model.provider}
                </span>
                <Select.ItemText>{model.name}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto shrink-0 text-[color:var(--accent-solid)]">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3.5 8.5 6.5 11.5 12.5 5.5" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}