import {presetIcons, presetUno, toEscapedSelector} from 'unocss'
import presetLegacyCompat from '@unocss/preset-legacy-compat'
import transformerVariantGroup from '@unocss/transformer-variant-group'
import transformerCompileClass from '@unocss/transformer-compile-class'
import {defineUsefulConfig} from 'unocss-preset-useful'
import * as theme from '@unocss/preset-uno/theme'

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
      [
        /^chip-(inset|circle|path)-(.+)$/u,
        ([, variableName, value]) => {
          return {
            'clip-path': `${variableName}(${value})`,
          }
        },
      ],
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
        /^var-(.+)=(.+)$/u,
        ([, variableName, value]) => {
          return {
            [`--un-${variableName}`]: value,
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
      // preset var
      // [
      //   /^(top|left|right|bottom)-var-(.+)?$/u,
      //   ([, direction, variableName]) => {
      //     if (variableName) {
      //       return {
      //         [direction]: `var(--var-${variableName})`,
      //       }
      //     }

      //     return {
      //       [direction]: `var(--var-${direction})`,
      //     }
      //   },
      // ],
      [
        /^(width|height|w|h|top|left|right|bottom)-var-(.+)?$/u,
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
    shortcuts: {
      'key-lunch': [
        'relative p-0 b-4px b-solid outline-none rd-22% bg-#f4f5f6 shadow-lunch-key duration-130',
        'ease-in-out cursor-pointer box-border data-[state="down"]:shadow-none [&>div]:data-[state="down"]:shadow-none',
        '[&>div]:data-[state="down"]:top-0',
      ],
      'key-piano-flat': [
        'block b-solid b-#ccc rd-t-0 inline-flex overflow-hidden b-b-2px',
        'focus-visible:outline-black focus-visible:outline-auto focus-visible:outline-2px',
        'p-0 relative rd-b-3px b-l-1px b-r-1px b-t-0 shadow-flat-up data-[state="down"]:shadow-flat-down b-b-#ddd',
        'data-[state="down"]-shadow-[0_2px_2px_rgba(0,0,0,0.4)] data-[state="down"]:scale-x-100',
        'data-[state="down"]:scale-y-99 data-[state="down"]:origin-top data-[state="down"]:b-b-1px',
        'data-[state="down"]:after:content-[""] data-[state="down"]:after:bg-black data-[state="down"]:after:h-full',
        'data-[state="down"]:after:left--5px data-[state="down"]:after:opacity-10 data-[state="down"]:after:absolute',
        'data-[state="down"]:after:top-0 data-[state="down"]:after:skew-x-0.5 data-[state="down"]:after:w-5px',
        'data-[state="down"]:after:shadow-flat-left data-[state="down"]:before:content-[""]',
        'data-[state="down"]:before:bg-black data-[state="down"]:before:h-full',
        'data-[state="down"]:before:right--5px data-[state="down"]:before:opacity-10',
        'data-[state="down"]:before:absolute',
        'data-[state="down"]:before:top-0 data-[state="down"]:before:skew-x--0.5 data-[state="down"]:before:w-5px',
        'data-[state="down"]:before:shadow-flat-right',
      ],
      'key-piano-sharp': [
        'b-solid rd-t-0 overflow-hidden b-b-black',
        'focus-visible:outline-white focus-visible:outline-auto focus-visible:outline-2px',
        'p-0 relative b-x-2px b-t-1px b-b-10px rd-b-2px shadow-sharp-key',
        'bg-gradient-linear bg-gradient-[-20deg,#333,#000,#333] bg-black',
        'b-t-#666 b-r-#222 b-b-#111 b-l-#555',
        'data-[state="down"]:b-2px data-[state="down"]:shadow-sharp-down',
      ],
    },
    theme: {
      animation: {
        counts: {
          blink: 'infinite',
          loading: 'infinite',
        },
        durations: {
          blink: '1s',
          loading: '2s',
        },
        keyframes: {
          blink: '{0%, 100% { opacity: 0.5; } 50% { opacity: 1; }}',
          loading:
            '{0% { transform: translateX(-100%); } 100% { transform: translateX(100%); }}',
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
    transformers: [transformerVariantGroup(), transformerCompileClass()] as any,
  },
)
