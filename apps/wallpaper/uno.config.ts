import {defineConfig, presetWind3} from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  rules: [
    ['wallpaper-speech-motion', {'transition-property': '--speech-height, --speech-y'}],
    [
      'wallpaper-speech',
      {'--speech-painted-height': 'min(100%,calc(48px + (100% - 48px) * var(--speech-reveal,1)))'},
    ],
    ['wallpaper-speech-stacked', {'--speech-painted-height': 'var(--speech-height)'}],
    [
      'wallpaper-speech-frame',
      {
        '--speech-frame-inset': 'calc(12px * (1 - var(--speech-reveal,1)))',
        bottom: 'var(--speech-frame-inset)',
        height: 'calc(var(--speech-painted-height) - var(--speech-frame-inset))',
      },
    ],
    [
      'wallpaper-speech-covered',
      {
        'clip-path': `polygon(
          -36px calc(100% - var(--speech-height) - 36px),
          calc(100% + 36px) calc(100% - var(--speech-height) - 36px),
          calc(100% + 36px) calc(100% + 48px * var(--speech-reveal,0)),
          calc(100% - .75rem) calc(100% + 48px * var(--speech-reveal,0)),
          calc(100% - .75rem) calc(100% - .75rem + 48px * var(--speech-reveal,0)),
          .75rem calc(100% - .75rem + 48px * var(--speech-reveal,0)),
          .75rem calc(100% + 48px * var(--speech-reveal,0)),
          -36px calc(100% + 48px * var(--speech-reveal,0))
        )`,
      },
    ],
    [
      'wallpaper-speech-covered-top',
      {
        'clip-path': `polygon(
        -36px calc(-48px * var(--speech-reveal,0)),
        .75rem calc(-48px * var(--speech-reveal,0)),
        .75rem calc(.75rem - 48px * var(--speech-reveal,0)),
        calc(100% - .75rem) calc(.75rem - 48px * var(--speech-reveal,0)),
        calc(100% - .75rem) calc(-48px * var(--speech-reveal,0)),
        calc(100% + 36px) calc(-48px * var(--speech-reveal,0)),
        calc(100% + 36px) calc(var(--speech-height) + 36px), -36px calc(var(--speech-height) + 36px)
      )`,
      },
    ],
    [
      'wallpaper-speech-contents',
      {
        'clip-path': [
          'inset(0 0 calc(100% - var(--speech-painted-height) + 12px * (1 - var(--speech-reveal,1))) 0 round',
          '.75rem)',
        ].join(' '),
        transform: 'translateY(calc(100% - var(--speech-painted-height)))',
      },
    ],
    [
      'wallpaper-speech-contents-top',
      {
        'clip-path': [
          'inset(0 0 calc(100% - var(--speech-painted-height) + 12px * (1 - var(--speech-reveal,1))) 0 round',
          '.75rem)',
        ].join(' '),
        transform: 'translateY(calc(12px * (1 - var(--speech-reveal,1))))',
      },
    ],
    [
      'wallpaper-speech-shadow',
      {
        'box-shadow': [
          '0 calc(4px - 9px * var(--speech-depth,0)) calc(6px + 9px * var(--speech-depth,0))',
          'calc(-1px + 1px * var(--speech-depth,0)) rgb(0 0 0 / calc(.1 + .05 * var(--speech-depth,0))),',
          '0 calc(2px + 22px * var(--speech-depth,0)) calc(4px + 38px * var(--speech-depth,0))',
          'calc(-2px - 6px * var(--speech-depth,0)) rgb(0 0 0 / calc(.1 + .3 * var(--speech-depth,0)))',
        ].join(' '),
      },
    ],
  ],
  shortcuts: {
    'wallpaper-button': [
      'min-h-10 rounded-lg bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-50',
    ],
    'wallpaper-disclosure': [
      'cursor-pointer rounded py-2 text-[13px] text-stone-700',
      'focus-visible:outline-solid',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
    ],
    'wallpaper-field': [
      'box-border min-h-8 min-w-0 w-full rounded-md border border-solid border-stone-300 bg-white',
      'px-2 py-1 text-[13px] text-stone-900 focus-visible:outline-2',
      'focus-visible:outline-solid',
      'focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50',
    ],
    'wallpaper-file-button': [
      'wallpaper-field w-auto shrink-0 cursor-pointer appearance-none [font-family:inherit]',
      'hover:bg-stone-50 aria-disabled:opacity-50 aria-disabled:cursor-default',
    ],
    'wallpaper-label': 'grid gap-2 text-sm font-medium text-stone-700',
    'wallpaper-menu': [
      'fixed box-border m-0 p-1 border border-solid border-stone-300 rounded-lg bg-white text-stone-900',
      'shadow-lg text-[13px] [font-family:inherit] overflow-y-auto overscroll-contain',
      '[position-anchor:var(--wallpaper-anchor)] [left:anchor(left)] [top:calc(anchor(bottom)+6px)]',
      'right-auto bottom-auto [min-width:anchor-size(width)] [max-width:calc(100dvw-2rem)]',
      '[max-height:min(16rem,calc(100dvh-2rem))] [position-try-fallbacks:flip-block,flip-inline]',
    ],
    'wallpaper-notice': [
      'fixed bottom-4 left-4 right-4 mx-auto flex max-w-xl items-center justify-between gap-3',
      'rounded-lg bg-stone-900 px-4 py-3 text-sm text-white shadow-lg',
    ],
    'wallpaper-number': [
      'box-border grid min-h-8 w-22 grid-cols-[minmax(0,1fr)_1.5rem] overflow-hidden',
      'rounded-md border border-solid border-stone-300 bg-white text-stone-900',
      'focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2',
      'focus-within:outline-blue-700 aria-disabled:opacity-50',
    ],
    'wallpaper-number-text': [
      'box-border min-w-0 w-full appearance-none border-0 bg-transparent px-2 py-1 text-[13px]',
      '[font-family:inherit] text-stone-900 focus:outline-none',
    ],
    'wallpaper-option': [
      'flex min-h-8 items-center justify-between gap-3 rounded px-2 py-1 cursor-pointer select-none',
      'hover:bg-stone-100 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-800',
    ],
    'wallpaper-row': [
      'box-border grid min-h-12 grid-cols-[minmax(0,1fr)_minmax(8rem,auto)] items-center gap-4',
      'border-0 border-b border-solid border-stone-200 py-2 text-[13px] text-stone-800',
    ],
    'wallpaper-segment': [
      'flex min-h-8 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-[13px] text-stone-700',
      'peer-checked:bg-white peer-checked:text-blue-700 peer-checked:shadow-sm',
      'peer-focus-visible:outline-solid',
      'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-700',
      'peer-disabled:opacity-50',
    ],
    'wallpaper-select': [
      'wallpaper-field flex items-center gap-3 text-left appearance-none [font-family:inherit]',
      '[anchor-name:var(--wallpaper-anchor)] cursor-pointer hover:border-stone-400',
      'aria-disabled:cursor-default aria-disabled:opacity-50',
    ],
    'wallpaper-step': [
      'grid place-items-center appearance-none border-0 bg-transparent p-0 text-stone-600',
      'cursor-pointer hover:bg-stone-100 active:bg-stone-200 disabled:opacity-40 disabled:cursor-default',
    ],
    'wallpaper-thumbnail': [
      'relative grid h-16 w-21 box-border place-items-center overflow-hidden rounded-lg',
      'border-2 border-solid border-stone-300 bg-stone-200/60 peer-checked:border-blue-700',
      'peer-focus-visible:outline-solid',
      'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
      'peer-focus-visible:outline-blue-700 peer-disabled:opacity-50',
    ],
    'wallpaper-tracking-handle': [
      'absolute box-border flex shrink-0 items-center justify-center appearance-none p-0 leading-none',
      '-translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-solid border-stone-400/60',
      'bg-white/25 text-slate-700 shadow-sm',
      'hover:border-blue-500/70 hover:bg-white/35 active:bg-blue-50/35',
      'cursor-grab active:cursor-grabbing [left:var(--point-x)] [top:var(--point-y)]',
      'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-blue-600',
      'focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40',
    ],
  },
})
