interface SIconProps {
  name: keyof typeof paths
}

const paths = {
  add: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  code: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 3l-4 18',
  folder: 'M3 7V5h6l2 2h10v12H3V7Z',
  forward: 'M9 5l7 7-7 7',
  info: 'M12 8h.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  refresh: 'M20 5v6h-6M20 11a8 8 0 1 0-2.3 6.7',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
}

export const SIcon = (props: SIconProps) => (
  <svg
    aria-hidden="true"
    class="h-4 w-4 shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.6]"
    viewBox="0 0 24 24"
  >
    <path d={paths[props.name]} />
  </svg>
)
