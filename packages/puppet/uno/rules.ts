import type {Rule} from 'unocss'

export const rules: Rule[] = [
  [
    'editor-checkerboard',
    {
      background: [
        'linear-gradient(45deg, #1b2421 25%, transparent 25%), linear-gradient(-45deg, #1b2421',
        '25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b2421 75%),',
        'linear-gradient(-45deg, transparent 75%, #1b2421 75%), #28332f',
      ].join(' '),
    },
  ],
  [
    'editor-parameter-marker',
    {
      background: [
        'linear-gradient(to right, transparent 0.3125rem, #ffbd59 0.3125rem 0.375rem,',
        'transparent 0.375rem)',
      ].join(' '),
    },
  ],
  [
    'editor-timeline-grid',
    {
      'background-image': [
        'linear-gradient(to right, #1d2522 0.0625rem, transparent 0.0625rem),',
        'linear-gradient(to right, #313c38 0.0625rem, transparent 0.0625rem)',
      ].join(' '),
    },
  ],
  [
    'editor-workspace-grid',
    {
      'grid-template': [
        "'toolbar toolbar toolbar toolbar toolbar' 4rem 'layers left-resizer viewport",
        "right-resizer inspector' minmax(0, 1fr) 'bottom-resizer bottom-resizer bottom-resizer",
        "bottom-resizer bottom-resizer' var(--bottom-resizer-size) 'timeline timeline timeline",
        "timeline timeline' var(--bottom-grid-size) / var(--left-grid-size)",
        'var(--left-resizer-size) minmax(0, 1fr) var(--right-resizer-size)',
        'var(--right-grid-size)',
      ].join(' '),
    },
  ],
]
