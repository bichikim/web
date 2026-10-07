export const slowcoveAnimations = {
  counts: {
    'relax-glass-reflection': 'infinite',
    'relax-sunlight-shift': 'infinite',
  },
  durations: {
    'relax-glass-reflection': '34s',
    'relax-sunlight-shift': '28s',
  },
  keyframes: {
    'relax-glass-reflection': `{
      from { opacity: 0.28; transform: translate3d(0, 0, 0); }
      to { opacity: 0.4; transform: translate3d(-1%, 0, 0); }
    }`,
    'relax-sunlight-shift': `{
      from { opacity: 0.4; transform: translate3d(0, 0, 0); }
      to { opacity: 0.75; transform: translate3d(3%, 2%, 0); }
    }`,
  },
  properties: {
    'relax-glass-reflection': {'animation-direction': 'alternate'},
    'relax-sunlight-shift': {'animation-direction': 'alternate'},
  },
  timingFns: {
    'relax-glass-reflection': 'ease-in-out',
    'relax-sunlight-shift': 'ease-in-out',
  },
} as const
