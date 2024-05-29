import {defineConfig, presetUno, toEscapedSelector} from 'unocss'

const readSizeName = (name: string): string => {
  switch (name) {
    case 'width':
    case 'w': {
      return 'width'
    }
    case 'height':
    case 'h': {
      return 'height'
    }
  }
  return name
}

export default defineConfig({
  content: {
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/u,
        '**/src/**/*.{js,ts}',
      ],
    },
  },
  presets: [presetUno()],
  rules: [
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
    [
      /^(top|left|right|bottom)-var(-.+)?$/u,
      ([, direction, varName]) => {
        if (varName) {
          return {
            [direction]: `var(--var${varName})`,
          }
        }
        return {
          [direction]: `var(--var-${direction})`,
        }
      },
    ],
    [
      /^(width|height|w|h)-var(-.+)?$/u,
      ([, direction, varName]) => {
        const kind = readSizeName(direction)
        if (varName) {
          return {
            [kind]: `var(--var${varName})`,
          }
        }
        return {
          [kind]: `var(--var-${kind})`,
        }
      },
    ],
  ],
  theme: {
    boxShadow: {
      'flat-key':
        'inset 0 1px 0px #fff, inset 0 -1px 0px #fff, inset 1px 0px 0px #fff,' +
        ' inset -1px 0px 0px #fff, 0 4px 3px rgb(0 0 0 / 70%)',
      'sharp-down-key':
        'inset 0px -1px 1px rgb(255 255 255 / 40%), 0 1px 0px rgb(0 0 0 / 80%),' +
        ' 0 2px 2px rgb(0 0 0 / 40%), 0 -1px 0px #000',
      'sharp-key':
        'inset 0px -1px 2px rgb(255 255 255 / 40%), 0 2px 3px rgb(0 0 0 / 40%)',
    },
  },
})
