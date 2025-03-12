import {presetIcons, presetUno, toEscapedSelector} from 'unocss'
import presetLegacyCompat from '@unocss/preset-legacy-compat'
import transformerVariantGroup from '@unocss/transformer-variant-group'
import transformerCompileClass from './transformer-class'
import {defineUsefulConfig} from 'unocss-preset-useful'
import * as theme from '@unocss/preset-uno/theme'
import {pianoKeys} from './piano'
const HUNDRED = 100

const toNumber = (value: string, defaultValue: number): number => {
  const result = Number(value)

  if (Number.isNaN(result)) {
    return defaultValue
  }

  return result
}

const readSizeName = (name: string): string => {
  switch (name) {
    case 'width':

    case 'w': {
      //
      return 'width'
    }
    case 'height':

    case 'h': {
      //
      return 'height'
    }
  }

  return name
}

export default defineUsefulConfig(
  {
    attributify: false,
    remToPx: false,
    theme,
  },
  {
    content: {
      pipeline: {
        include: [
          /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/u,
          '**/src/**/*.{js,ts}',
        ],
      },
    },
    presets: [
      presetIcons(),
      presetUno({
        autoInstall: true,
      }),
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
      // inject var
      [
        /^un-var-(.+)=(.+)$/u,
        ([, variableName, value]) => {
          return {
            [`--un-${variableName}`]: value,
          }
        },
      ],
      [
        /^var-(.+)=(.+)$/u,
        ([, variableName, value]) => {
          return {
            [`--var-${variableName}`]: value,
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
            ' repeating-linear-gradient( #9495a555, #9495a5 )',
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
      [
        /^(width|height|w|h|top|left|right|bottom|border-color)-var-(.+)?$/u,
        ([, direction, variableName]) => {
          const kind = readSizeName(direction)

          if (variableName) {
            return {
              [kind]: `var(--var-${variableName})`,
            }
          }

          return {
            [kind]: `var(--var-${kind})`,
          }
        },
      ],
    ],
    shortcuts: [pianoKeys],
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
          blink: '{0%, 100% { opacity: 0.5; } 50% { opacity: 1; }}',
          slide:
            '{0% { transform: translateX(-100%); } 100% { transform: translateX(100%); }}',
          'slide-text':
            '{0% { transform: translateX(0%); } 100% { transform: translateX(-50%); }}',
        },
      },
      boxShadow: {
        'flat-down':
          'inset 0 0 0 #fff, inset 0 0 0 #fff, inset 0 0 0 #fff,' +
          ' inset 0 0 0 #fff, 0 4px 3px rgb(0 0 0 / 30%)',
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
        'sharp-key':
          'inset 0px -1px 2px rgb(255 255 255 / 40%), 0 2px 3px rgb(0 0 0 / 40%)',
      },
      breakpoints: {
        md: '768px',
        sm: '376px',
      },
      colors: {
        primary: 'var(--un-color-primary)',
      },
    },
    transformers: [
      transformerVariantGroup(),
      transformerCompileClass(),
    ] as any,
  },
)
