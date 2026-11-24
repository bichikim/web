import {defineConfig, presetWind3} from 'unocss'
import {
  COVERED_HEIGHT,
  COVERED_OVERLAP,
  MAXIMUM_SPEECH_HEIGHT,
} from './src/features/speech/constants'

export default defineConfig({
  presets: [presetWind3()],
  rules: [
    ['wallpaper-speech-motion', {'transition-property': '--speech-height, --speech-y'}],
    [
      'wallpaper-speech',
      {
        '--speech-painted-height': [
          `min(100%,calc(${COVERED_HEIGHT}px +`,
          `(100% - ${COVERED_HEIGHT}px) * var(--speech-reveal,1)))`,
        ].join(' '),
      },
    ],
    ['wallpaper-speech-stacked', {'--speech-painted-height': 'var(--speech-height)'}],
    [
      'wallpaper-speech-frame',
      {
        height: 'var(--speech-painted-height)',
      },
    ],
    [
      'wallpaper-speech-covered',
      {
        'clip-path': `polygon(
          -36px calc(100% - var(--speech-height) - 36px),
          calc(100% + 36px) calc(100% - var(--speech-height) - 36px),
          calc(100% + 36px) calc(100% + ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
          calc(100% - .75rem) calc(100% + ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
          calc(100% - .75rem) calc(100% - ${COVERED_OVERLAP}px + ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
          .75rem calc(100% - ${COVERED_OVERLAP}px + ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
          .75rem calc(100% + ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
          -36px calc(100% + ${COVERED_HEIGHT}px * var(--speech-reveal,0))
        )`,
      },
    ],
    [
      'wallpaper-speech-covered-top',
      {
        'clip-path': `polygon(
        -36px calc(-${COVERED_HEIGHT}px * var(--speech-reveal,0)),
        .75rem calc(-${COVERED_HEIGHT}px * var(--speech-reveal,0)),
        .75rem calc(${COVERED_OVERLAP}px - ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
        calc(100% - .75rem) calc(${COVERED_OVERLAP}px - ${COVERED_HEIGHT}px * var(--speech-reveal,0)),
        calc(100% - .75rem) calc(-${COVERED_HEIGHT}px * var(--speech-reveal,0)),
        calc(100% + 36px) calc(-${COVERED_HEIGHT}px * var(--speech-reveal,0)),
        calc(100% + 36px) calc(var(--speech-height) + 36px), -36px calc(var(--speech-height) + 36px)
      )`,
      },
    ],
    [
      'wallpaper-speech-contents',
      {
        'clip-path': [
          'inset(0 0 calc(100% - var(--speech-painted-height) +',
          `${COVERED_OVERLAP}px * (1 - var(--speech-reveal,1))) 0 round`,
          '.75rem)',
        ].join(' '),
        'max-height': `min(var(--speech-limit,${MAXIMUM_SPEECH_HEIGHT}px),${MAXIMUM_SPEECH_HEIGHT}px)`,
        'min-height': `min(var(--speech-minimum-height,0px),${MAXIMUM_SPEECH_HEIGHT}px)`,
        transform: 'translateY(calc(100% - var(--speech-painted-height)))',
      },
    ],
    [
      'wallpaper-speech-contents-top',
      {
        'clip-path': [
          'inset(0 0 calc(100% - var(--speech-painted-height) +',
          `${COVERED_OVERLAP}px * (1 - var(--speech-reveal,1))) 0 round`,
          '.75rem)',
        ].join(' '),
        transform: `translateY(calc(${COVERED_OVERLAP}px * (1 - var(--speech-reveal,1))))`,
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
    'theme-action': [
      'inline-flex min-h-9 items-center justify-center rounded-full border border-solid px-4 py-1.5',
      'cursor-pointer text-sm font-semibold [font-family:inherit]',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700',
      'disabled:cursor-default disabled:opacity-45',
    ].join(' '),
    'theme-field': [
      'min-h-9 min-w-0 w-full box-border rounded-2 border border-solid border-stone-300 bg-white px-2.5',
      'text-sm text-stone-900 [font-family:inherit] focus-visible:outline-violet-700',
    ].join(' '),
    'theme-primary':
      'theme-action border-violet-900 bg-violet-900 text-white hover:enabled:bg-violet-800',
    'theme-secondary': 'theme-action border-violet-200 bg-white text-violet-950 hover:bg-violet-50',
    'wallpaper-breadcrumb-arrow': [
      'wallpaper-breadcrumb-control w-6 shrink-0 border-transparent bg-transparent p-0 text-stone-500',
      'hover:bg-stone-200 hover:text-stone-900',
    ],
    'wallpaper-breadcrumb-control': [
      'box-border inline-flex min-h-8 min-w-0 max-w-full cursor-pointer items-center justify-center gap-2',
      'rounded-md border border-solid text-left text-[13px] [font-family:inherit]',
      '[anchor-name:var(--wallpaper-anchor)] appearance-none',
      'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700',
      'aria-disabled:cursor-default aria-disabled:opacity-50',
    ],
    'wallpaper-breadcrumb-select': [
      'wallpaper-breadcrumb-control border-stone-300 bg-white px-2 py-1 font-medium text-stone-900',
      'hover:border-stone-400 hover:bg-stone-50',
    ],
    'wallpaper-button': [
      'min-h-10 rounded-lg bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-50',
    ],
    'wallpaper-chain-action': [
      'h-6 w-6 cursor-pointer rounded border-0 bg-transparent text-stone-500 hover:bg-stone-100',
      'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700',
      'disabled:opacity-30 disabled:cursor-default',
    ],
    'wallpaper-disclosure': [
      'flex min-h-10 box-border cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2',
      'border-0 border-b border-solid border-transparent text-[13px] font-medium leading-5 text-stone-700',
      'select-none hover:bg-stone-100/80 [&::-webkit-details-marker]:hidden',
      'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
      'focus-visible:outline-blue-700',
      "after:content-[''] after:ml-auto after:block after:h-1.5 after:w-1.5 after:shrink-0",
      'after:border-0 after:border-b-2 after:border-r-2 after:border-solid after:border-stone-500 after:rotate-45',
    ],
    'wallpaper-disclosure-content': 'grid min-w-0 gap-3 p-3',
    'wallpaper-disclosure-panel': [
      'min-w-0 rounded-lg border border-solid border-stone-200 bg-stone-50/60',
      '[&[open]>summary]:rounded-b-none [&[open]>summary]:border-b-stone-200',
      '[&[open]>summary]:after:rotate-225',
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
    'wallpaper-section-tab': [
      'flex min-h-10 min-w-0 items-center justify-center gap-2 border-0 border-b-2 border-solid',
      'border-transparent px-2 text-[13px] text-stone-600',
      'peer-checked:border-blue-700 peer-checked:text-blue-700 peer-checked:font-semibold',
      'peer-focus-visible:outline-solid peer-focus-visible:outline-2',
      'peer-focus-visible:outline-offset-[-2px] peer-focus-visible:outline-blue-700 peer-disabled:opacity-50',
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
    'wallpaper-settings-link': [
      'flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-between gap-3',
      'rounded-md border-0 bg-transparent px-3 py-2 text-left text-[13px] text-stone-800 [font-family:inherit]',
      'hover:bg-stone-100 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700',
      'disabled:cursor-default disabled:opacity-40',
    ],
    'wallpaper-speech-action': [
      'relative inline-flex h-6 min-w-6 shrink-0 cursor-pointer items-center justify-center appearance-none',
      'rounded-md border-0 bg-transparent p-0 leading-none transition-colors duration-150 hover:bg-black/5',
      'focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-700',
      'disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none',
    ],
    'wallpaper-speech-preview': [
      'pointer-events-none visible opacity-100 [translate:0_0]',
      '[transition-property:opacity,translate,visibility] duration-240',
      '[transition-timing-function:cubic-bezier(.22,.8,.25,1)] motion-reduce:transition-none',
      '[[data-preview-hidden=true]_&]:invisible [[data-preview-hidden=true]_&]:opacity-0',
      '[[data-preview-hidden=true]_&]:[translate:0_12px]',
      '[[data-anchor=top][data-preview-hidden=true]_&]:[translate:0_-12px]',
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
