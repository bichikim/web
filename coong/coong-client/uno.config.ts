import {defineConfig} from 'unocss'

export default defineConfig({
  content: {
    pipeline: {
      include: [
        // eslint-disable-next-line require-unicode-regexp
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        'src/**/*.{js,ts}',
      ],
    },
  },
  theme: {
    boxShadow: {
      'flat-key':
        'inset 0 1px 0px #fff, inset 0 -1px 0px #fff, inset 1px 0px 0px #fff,' +
        ' inset -1px 0px 0px #fff, 0 4px 3px rgb(0 0 0 / 70%)',
      'sharp-key': 'inset 0px -1px 2px rgb(255 255 255 / 40%), 0 2px 3px rgb(0 0 0 / 40%)',
      'sharp-down-key': 'inset 0px -1px 1px rgb(255 255 255 / 40%), 0 1px 0px rgb(0 0 0 / 80%),' +
        ' 0 2px 2px rgb(0 0 0 / 40%), 0 -1px 0px #000',
    },
  },
})
