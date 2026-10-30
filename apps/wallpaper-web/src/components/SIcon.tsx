interface SIconProps {
  readonly name?:
    | 'arrow'
    | 'download'
    | 'face'
    | 'speech'
    | 'stop'
    | 'spark'
    | 'monitor'
    | 'grid'
    | 'globe'
    | 'pause'
    | 'play'
    | 'check'
    | 'close'
    | 'reset'
    | 'settings'
    | 'plus'
    | 'walk'
    | 'music'
    | 'previous'
    | 'next'
    | 'shuffle'
    | 'repeat'
    | 'volume'
    | 'list'
  readonly class?: string
}

const PATHS = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M18 6 6 18',
  download: 'M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4',
  face: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 9h.01M16 9h.01M8 14a4 4 0 0 0 8 0',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z',
  grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',
  monitor: 'M3 4h18v13H3V4Zm5 17h8m-4-4v4',
  music:
    'M9 18V5l11-2v13M9 8l11-2M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0Zm11-2a3 2 0 1 1-6 0 3 2 0 0 1 6 0Z',
  next: 'm5 5 10 7-10 7V5Zm14 0v14',
  pause: 'M9 5v14m6-14v14',
  play: 'm8 4 12 8-12 8V4Z',
  plus: 'M12 5v14M5 12h14',
  previous: 'm19 5-10 7 10 7V5ZM5 5v14',
  repeat: 'm17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  shuffle: 'm17 3 4 4-4 4M3 17h2c5 0 9-10 14-10h2M3 7h2c2 0 4 2 5 4m4 4c2 2 3 2 5 2h2m-4-4 4 4-4 4',
  spark: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',
  speech: 'M21 11a8 8 0 0 1-8 8H8l-5 3V11a9 9 0 0 1 18 0ZM8 10h8M8 14h5',
  stop: 'M6 6h12v12H6V6Z',
  volume: 'm11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  walk: 'M14 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-3 8-3 8m5-12-2 4 4 3v5M5 12l4-1 3-4 3 4 4 1',
} as const

export const SIcon = (props: SIconProps) => (
  <svg
    class={`-m-1 shrink-0 scale-85 sm:scale-100 ${props.class ?? 'h-6 w-6'}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d={PATHS[props.name ?? 'arrow']} />
  </svg>
)
