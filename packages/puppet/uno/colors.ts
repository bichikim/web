export const colorDefaults = {
  accent: '#64e5c4',
  'axis-x': '#f37d87',
  'axis-y': 'var(--puppet-color-accent,#64e5c4)',
  'axis-z': '#78a8ef',
  backdrop: '#030706',
  border: '#35413d',
  canvas: '#111715',
  control: '#171e1b',
  divider: '#27302d',
  error: '#ff7a76',
  hover: '#293832',
  input: '#121816',
  light: '#ffffff',
  'on-accent': '#07110f',
  'overlay-dark': '#000000',
  'overlay-light': '#ffffff',
  panel: '#101513',
  selected: '#24443b',
  shadow: '#000000',
  text: '#edf4f0',
  'text-muted': '#84918c',
  'text-secondary': '#b9c5c0',
  warning: '#e5b55a',
  'weight-high': '#f35e62',
  'weight-low': '#3185e8',
} as const

export const colorPreflight = () =>
  `:root,:host{${[
    ...Object.entries(colorDefaults).map(
      ([key, value]) => `--puppet-default-color-${key}:${value}`,
    ),
    ...(
      [
        ['error', 'surface', '12%'],
        ['warning', 'surface', '12%'],
        ['error', 'active-surface', '40%'],
      ] as const
    ).map(
      ([key, surface, amount]) =>
        `--puppet-${key}-${surface}:color-mix(in srgb,var(--puppet-color-${key}) ${amount},` +
        'var(--puppet-color-panel,#101513))',
    ),
  ].join(';')}}`
