import * as Select from '@radix-ui/react-select';

export default function ModelSelect({ models, value, onChange }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex w-full min-w-0 items-center justify-between rounded-sm border border-[#4e4f56] bg-[#202123] px-3 py-2 text-left text-sm text-[#ececf1] outline-none hover:border-[#19c37d] focus:border-[#19c37d] sm:min-w-[180px] sm:py-1.5">
        <Select.Value className="truncate" />
        <Select.Icon className="ml-2">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
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
          className="z-50 w-[var(--radix-select-trigger-width)] max-w-[min(92vw,22rem)] overflow-hidden rounded-md border border-[#4e4f56] bg-[#202123] shadow-lg"
        >
          <Select.Viewport className="p-1">
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="relative flex min-h-8 cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-[#ececf1] outline-none data-[highlighted]:bg-[#19c37d] data-[highlighted]:text-white sm:px-6"
              >
                <Select.ItemText>{`${model.provider}/${model.name}`}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}