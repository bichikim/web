interface SIconProps {
  name: keyof typeof icons
}

const icons = {
  add: 'i-tabler-plus',
  addContext: 'i-tabler-message-plus',
  arrowLeft: 'i-tabler-arrow-left',
  arrowRight: 'i-tabler-arrow-right',
  back: 'i-tabler-chevron-left',
  check: 'i-tabler-check',
  chevronDown: 'i-tabler-chevron-down',
  close: 'i-tabler-x',
  code: 'i-tabler-code',
  folder: 'i-tabler-folder',
  forward: 'i-tabler-chevron-right',
  info: 'i-tabler-info-circle',
  memo: 'i-tabler-notes',
  minus: 'i-tabler-minus',
  more: 'i-tabler-dots',
  newFile: 'i-tabler-file-plus',
  newFolder: 'i-tabler-folder-plus',
  refresh: 'i-tabler-reload',
  search: 'i-tabler-search',
  target: 'i-tabler-target',
}

export const SIcon = (props: SIconProps) => (
  <span
    aria-hidden="true"
    class={`inline-block h-[var(--icon-size,16px)] w-[var(--icon-size,16px)] shrink-0 ${icons[props.name]}`}
  />
)
