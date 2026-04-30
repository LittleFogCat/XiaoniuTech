import * as Select from '@radix-ui/react-select';

export default function ModelSelect({ models, value, onChange }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="inline-flex items-center justify-between rounded-sm px-3 py-1.5 text-sm bg-[#202123] text-[#ececf1] border border-[#4e4f56] hover:border-[#19c37d] outline-none focus:border-[#19c37d] min-w-[180px]">
        <Select.Value />
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
          className="z-50 overflow-hidden bg-[#202123] border border-[#4e4f56] rounded-md shadow-lg"
        >
          <Select.Viewport className="p-1">
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="relative flex items-center h-8 px-6 text-sm text-[#ececf1] rounded-sm cursor-pointer select-none outline-none data-[highlighted]:bg-[#19c37d] data-[highlighted]:text-white"
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