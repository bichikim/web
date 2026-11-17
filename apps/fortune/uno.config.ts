import {defineConfig, presetWind3} from 'unocss'

export default defineConfig({
  preflights: [
    {
      getCSS: () => `
        *, ::before, ::after {
          box-sizing: border-box;
          border-width: 0;
          border-style: solid;
          border-color: currentColor;
        }
        body {
          margin: 0;
          background: #faf8f4;
          color: #2c2933;
          font-family: ui-sans-serif, system-ui, sans-serif;
          line-height: 1.625;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        h1, h2, h3, p, dl, dd { margin: 0; }
        a { color: inherit; text-decoration: none; }
      `,
    },
  ],
  presets: [presetWind3()],
  shortcuts: {
    'fortune-card': 'col-start-1 row-start-1 h-52 w-35 rounded-3xl border p-3 sm:h-60 sm:w-40',
    'fortune-focus': [
      'focus-visible:outline-2 focus-visible:outline-solid',
      'focus-visible:outline-[#65488a] focus-visible:outline-offset-4',
    ].join(' '),
    'fortune-link': [
      'fortune-focus inline-flex min-h-11 items-center justify-center rounded-full',
      'bg-[#65488a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#533773]',
    ].join(' '),
  },
})
