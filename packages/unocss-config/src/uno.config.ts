// oxlint-disable eslint-js/prefer-named-capture-group
import {defineConfig, presetIcons, presetWind3, toEscapedSelector, type Variant} from 'unocss'
import presetLegacyCompat from '@unocss/preset-legacy-compat'
import transformerCompileClass from './transformer-class'
import presetUseful from 'unocss-preset-useful'
import {presetVariable} from '@winter-love/unocss-preset-var'
import {pianoShortcuts} from './piano'
import {auroraShortcuts} from './aurora'
const HUNDRED = 100

const kobalteStates = [
  'valid',
  'invalid',
  'required',
  'disabled',
  'readonly',
  'checked',
  'indeterminate',
  'selected',
  'pressed',
  'expanded',
  'opened',
  'closed',
  'highlighted',
  'current',
  'placeholder-shown',
  'visible',
  'animate',
]

const kobalteOrientations = ['horizontal', 'vertical']

const kobalteSwipeStates = ['start', 'move', 'cancel', 'end']

const kobalteSwipeDirections = ['up', 'down', 'left', 'right']

const createDataVariant = (name: string, selector: string): Variant => {
  return (matcher) => {
    const prefix = `${name}:`

    if (!matcher.startsWith(prefix)) {
      return
    }

    return {
      matcher: matcher.slice(prefix.length),
      selector: (input) => selector.replaceAll('&', input),
    }
  }
}

const createKobalteVariants = (): Variant[] => {
  const variants: Variant[] = []

  for (const state of kobalteStates) {
    variants.push(createDataVariant(`ui-${state}`, `&[data-${state}]`))
    variants.push(createDataVariant(`ui-not-${state}`, `&:not([data-${state}])`))
    variants.push(createDataVariant(`ui-group-${state}`, `.group[data-${state}] &`))
    variants.push(createDataVariant(`ui-peer-${state}`, `.peer[data-${state}] ~ &`))
  }

  for (const orientation of kobalteOrientations) {
    variants.push(createDataVariant(`ui-${orientation}`, `&[data-orientation='${orientation}']`))
    variants.push(
      createDataVariant(`ui-not-${orientation}`, `&:not([data-orientation='${orientation}'])`),
    )
    variants.push(
      createDataVariant(`ui-group-${orientation}`, `.group[data-orientation='${orientation}'] &`),
    )
    variants.push(
      createDataVariant(`ui-peer-${orientation}`, `.peer[data-orientation='${orientation}'] ~ &`),
    )
  }

  for (const state of kobalteSwipeStates) {
    variants.push(createDataVariant(`ui-swipe-${state}`, `&[data-swipe='${state}']`))
    variants.push(createDataVariant(`ui-not-swipe-${state}`, `&:not([data-swipe='${state}'])`))
    variants.push(createDataVariant(`ui-group-swipe-${state}`, `.group[data-swipe='${state}'] &`))
    variants.push(createDataVariant(`ui-peer-swipe-${state}`, `.peer[data-swipe='${state}'] ~ &`))
  }

  for (const direction of kobalteSwipeDirections) {
    variants.push(
      createDataVariant(
        `ui-swipe-direction-${direction}`,
        `&[data-swipe-direction='${direction}']`,
      ),
    )
    variants.push(
      createDataVariant(
        `ui-not-swipe-direction-${direction}`,
        `&:not([data-swipe-direction='${direction}'])`,
      ),
    )
    variants.push(
      createDataVariant(
        `ui-group-swipe-direction-${direction}`,
        `.group[data-swipe-direction='${direction}'] &`,
      ),
    )
    variants.push(
      createDataVariant(
        `ui-peer-swipe-direction-${direction}`,
        `.peer[data-swipe-direction='${direction}'] ~ &`,
      ),
    )
  }

  return variants
}

const toNumber = (value: string, defaultValue: number): number => {
  const result = Number(value)

  if (Number.isNaN(result)) {
    return defaultValue
  }

  return result
}

export default defineConfig({
  content: {
    pipeline: {
      include: [
        //
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/u,
        '**/src/**/*.{js,ts}',
      ],
    },
  },
  presets: [
    presetUseful({
      attributify: false,
      compileClass: false,
      directives: false,
      icons: false,
      preflights: false,
      remToPx: false,
      variantGroup: false,
      wind3: false,
      wind4: false,
    }),
    presetIcons(),
    presetWind3({
      autoInstall: true,
    }),
    presetVariable(),
    presetLegacyCompat({
      commaStyleColorFunction: true,
    }),
  ] as any,
  rules: [
    // chip
    // [
    //   /^chip-(inset|circle|path)-(.+)$/u,
    //   ([, variableName, value]) => {
    //     return {
    //       'clip-path': `${variableName}(${value})`,
    //     }
    //   },
    // ],
    // outline opacity
    [
      /^outline-opacity-(.+)$/u,
      ([, value]) => {
        return {
          '--un-outline-color-opacity': toNumber(value, HUNDRED) / HUNDRED,
        }
      },
    ],
    [
      'disable-tap-zoom',
      {
        'touch-action': 'manipulation',
      },
    ],
    [
      'pattern-a',
      {
        'background-color': '#e5e5f7',
        'background-image':
          'repeating-radial-gradient( circle at 0 0, transparent 0, #e5e5f7 6px ),' +
          ' repeating-linear-gradient(rgba(195, 196, 202, 0.33), #9495a5 )',
        opacity: '0.3',
      },
    ],
    //
    [
      /^scrollbar-none$/u,
      (_, {rawSelector}) => {
        const selector = toEscapedSelector(rawSelector)

        return `
          ${selector}::-webkit-scrollbar {
            display: none;
          }
          ${selector} {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `
      },
    ],
  ],
  // keep aurora animation
  safelist: ['animate-aurora'],
  shortcuts: [pianoShortcuts, auroraShortcuts],
  theme: {
    animation: {
      counts: {
        blink: 'infinite',
        slide: 'infinite',
        'slide-text': 'infinite',
      },
      durations: {
        blink: '1s',
        slide: '2s',
        'slide-text': '2s',
      },
      keyframes: {
        aurora: `
            {0% { background-position: 0% 50%; }
             100% { background-position: 133.333% 50%; }}`,
        blink: '{0%, 100% { opacity: 0.5; } 50% { opacity: 1; }}',
        slide: '{0% { transform: translateX(-100%); } 100% { transform: translateX(100%); }}',
        'slide-text': '{0% { transform: translateX(0%); } 100% { transform: translateX(-50%); }}',
      },
    },
    boxShadow: {
      'flat-down':
        'inset 0 0 0 #fff, inset 0 0 0 #fff, inset 0 0 0 #fff, inset 0 0 0 #fff, 0 4px 3px rgb(0 0 0 / 30%)',
      'flat-left': '3px 0 3px #000',
      'flat-right': '-3px 0 3px #000',
      'flat-up':
        'inset 0 1px 0px #fff, inset 0 -3px 3px #fff, inset 1px 0px 0px #fff,' +
        ' inset -1px 0px 0px #fff, 0 4px 5px rgb(0 0 0 / 20%)',
      'lunch-content': 'inset 0px -4px 0px rgba(0,0,0,0.2)',
      'lunch-key': '0 20px 25px rgba(0,0,0,0.2)',
      'sharp-down':
        'inset 0px -1px 1px rgb(255 255 255 / 40%), 0 1px 0px rgb(0 0 0 / 80%),' +
        ' 0 2px 2px rgb(0 0 0 / 40%), 0 -1px 0px #000',
      'sharp-key': 'inset 0px -1px 2px rgb(255 255 255 / 40%), 0 2px 3px rgb(0 0 0 / 40%)',
    },
    breakpoints: {
      md: '768px',
      sm: '376px',
    },
    colors: {
      primary: 'var(--un-color-primary)',
    },
  },
  transformers: [transformerCompileClass()] as any,
  variants: createKobalteVariants(),
} as any) as any
