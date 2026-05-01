import * as Select from '@radix-ui/react-select';

export default function ModelSelect({ models, value, onChange }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-600/70 bg-[linear-gradient(180deg,rgba(30,41,59,0.82),rgba(15,23,42,0.82))] px-3 text-left text-sm font-medium text-slate-100 shadow-[0_10px_24px_rgba(15,23,42,0.14)] outline-none transition hover:border-slate-500/80 hover:bg-slate-800/70 focus:border-sky-500/35 focus:shadow-[0_12px_28px_rgba(37,99,235,0.12)] data-[placeholder]:text-slate-400/70 sm:h-11 sm:min-w-[180px] sm:px-4">
        <Select.Value className="truncate" placeholder="选择模型" />
        <Select.Icon className="shrink-0 text-slate-400 transition group-data-[state=open]:text-sky-200">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2.5 4.5L6 8L9.5 4.5" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-[var(--radix-select-trigger-width)] max-w-[min(92vw,22rem)] overflow-hidden rounded-[22px] border border-slate-700/70 bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))] shadow-[0_18px_48px_rgba(15,23,42,0.28)] backdrop-blur-xl"
        >
          <Select.Viewport className="p-2">
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="relative flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-200 outline-none transition data-[highlighted]:bg-sky-500/12 data-[highlighted]:text-white data-[state=checked]:bg-sky-500/10 sm:px-4"
              >
                <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-600/70 bg-slate-800/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100/85">
                  {model.provider}
                </span>
                <Select.ItemText>{model.name}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto shrink-0 text-sky-200">
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