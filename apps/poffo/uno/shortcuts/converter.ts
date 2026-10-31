export const converterShortcuts = {
  'converter-file-input': [
    'block w-full rounded-md border border-[var(--puppet-color-border,#475569)]',
    'bg-[var(--puppet-color-input,#020617)] p-3 text-sm text-[var(--puppet-color-text,#f1f5f9)]',
    'focus-visible:outline-[var(--puppet-color-accent,#64e5c4)]',
    '[&::file-selector-button]:mr-3 [&::file-selector-button]:rounded [&::file-selector-button]:border',
    '[&::file-selector-button]:border-solid [&::file-selector-button]:border-[var(--puppet-color-border,#475569)]',
    '[&::file-selector-button]:bg-[var(--puppet-color-control,#171e1b)]',
    '[&::file-selector-button]:text-[var(--puppet-color-text,#f1f5f9)]',
    '[&::file-selector-button]:px-3 [&::file-selector-button]:py-1 [&::file-selector-button]:cursor-pointer',
    '[&::file-selector-button:hover]:bg-[var(--puppet-color-hover,#293832)]',
  ],
  'converter-page': [
    'px-6 py-10',
    '[&.puppet-editor]:block [&.puppet-editor]:h-auto [&.puppet-editor]:min-h-screen',
    '[&.puppet-editor]:overflow-auto [&.puppet-editor]:text-base',
    '[&.puppet-editor]:bg-[var(--puppet-color-panel,#101513)]',
    '[&.puppet-editor]:text-[var(--puppet-color-text,#f1f5f9)]',
  ],
  'converter-texture-list': 'm-0 list-none space-y-2 p-0',
  'converter-texture-name': 'min-w-0 flex-1 truncate',
  'converter-texture-row': 'flex items-center gap-2 text-sm',
}
