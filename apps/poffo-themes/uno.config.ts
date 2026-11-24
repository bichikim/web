import {defineConfig, presetWind3} from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  shortcuts: {
    'page-title': [
      'm-0 max-w-185 break-keep text-[clamp(2.75rem,7.5vw,5.8rem)]',
      'font-bold leading-[1.04] tracking-[-0.07em]',
    ].join(' '),
    'page-width': 'mx-auto max-w-300 px-5 sm:px-9',
    'primary-link': [
      'inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm text-white font-semibold',
      'no-underline hover:bg-plum focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3',
      'focus-visible:outline-plum',
    ].join(' '),
    'quiet-link': [
      'text-sm font-semibold text-plum underline decoration-plum/40',
      'underline-offset-4 hover:decoration-current',
    ].join(' '),
  },
  theme: {
    colors: {
      ink: '#261e32',
      muted: '#655a6f',
      paper: '#faf7f2',
      plum: '#553573',
    },
    fontFamily: {sans: '-apple-system,BlinkMacSystemFont,"Pretendard","Segoe UI",sans-serif'},
  },
})
