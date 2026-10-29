import {defineConfig, presetWind3} from 'unocss'

interface StoryMotion {
  readonly delay?: string
  readonly duration: string
  readonly frames: string
}

const WIPE_COMPOSITION = {
  far: 156.83791,
  halfWidth: 37.7523357,
  slant: 16.6159198,
  spread: 15.5114436,
}
const planeClip = (shift: number) => {
  const {halfWidth, slant} = WIPE_COMPOSITION
  const point = (offset: number, y: string) =>
    `calc(50% + ${offset}vw + (${shift}vw * var(--wipe-direction))) ${y}`
  return `polygon(${point(-slant - halfWidth, '0')},${point(-slant + halfWidth, '0')},
    ${point(slant + halfWidth, '100%')},${point(slant - halfWidth, '100%')})`
}

const STORY_MOTION: Record<string, StoryMotion> = {
  'desktop-wallpaper': {
    duration: '3s',
    frames: '{from{opacity:1}to{opacity:1}}',
  },
  'story-band-cover': {
    delay: 'calc(var(--band-index) * 32ms)',
    duration: '440ms',
    frames: `{0%{transform:translateX(calc(110% * var(--band-direction)))}
      100%{transform:translateX(0)}}`,
  },
  'story-band-reveal': {
    delay: 'calc(var(--band-index) * 32ms)',
    duration: '580ms',
    frames: `{0%{transform:translateX(0)}
      100%{transform:translateX(calc(-110% * var(--band-direction)))}}`,
  },
  'story-caption': {
    duration: '1040ms',
    frames: `{0%,40%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}`,
  },
  'story-cover': {
    duration: '460ms',
    frames: `{0%,12%{transform:translateX(calc(115% * var(--wipe-direction))) skewX(-12deg)}
      88%,100%{transform:translateX(0) skewX(-12deg)}}`,
  },
  'story-cover-back': {
    duration: '460ms',
    frames: `{0%{transform:translateX(calc(115% * var(--wipe-direction))) skewX(-12deg)}
      64%,100%{transform:translateX(0) skewX(-12deg)}}`,
  },
  'story-cover-mid': {
    duration: '460ms',
    frames: `{0%,6%{transform:translateX(calc(115% * var(--wipe-direction))) skewX(-12deg)}
      76%,100%{transform:translateX(0) skewX(-12deg)}}`,
  },
  'story-iris-back-cover': {
    duration: '460ms',
    frames: `{0%{clip-path:circle(0% at var(--iris-x) var(--iris-y))}
      80%,100%{clip-path:circle(145% at var(--iris-x) var(--iris-y))}}`,
  },
  'story-iris-back-reveal': {
    duration: '640ms',
    frames: `{0%,18%{clip-path:circle(145% at var(--iris-x) var(--iris-y))}
      100%{clip-path:circle(0% at var(--iris-x) var(--iris-y))}}`,
  },
  'story-iris-cover': {
    duration: '460ms',
    frames: `{0%,12%{clip-path:circle(0% at var(--iris-x) var(--iris-y))}
      100%{clip-path:circle(145% at var(--iris-x) var(--iris-y))}}`,
  },
  'story-iris-reveal': {
    duration: '640ms',
    frames: `{0%{clip-path:circle(145% at var(--iris-x) var(--iris-y))}
      88%,100%{clip-path:circle(0% at var(--iris-x) var(--iris-y))}}`,
  },
  // Scale the 30deg artwork path from a 16:10 composition into the viewport.
  'story-original-cover-back': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '440ms',
    frames: `{from{transform:translate(calc(180% * var(--wipe-direction)),
        calc(-110.8512517dvh * var(--wipe-direction))) rotate(-28deg)}
      to{transform:translate(calc(-17.8022% * var(--wipe-direction)),
        calc(10.9633120dvh * var(--wipe-direction))) rotate(-28deg)}}`,
  },
  'story-original-cover-front': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '440ms',
    frames: `{0%{transform:translate(calc(180% * var(--wipe-direction)),
        calc(-110.8512517dvh * var(--wipe-direction))) rotate(-28deg)}
      100%{transform:translate(calc(17.8022% * var(--wipe-direction)),
        calc(-10.9633120dvh * var(--wipe-direction))) rotate(-28deg)}}`,
  },
  'story-original-cover-mid': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '440ms',
    frames: `{0%{transform:translate(calc(180% * var(--wipe-direction)),
        calc(-110.8512517dvh * var(--wipe-direction))) rotate(-28deg)}
      100%{transform:translate(0,0) rotate(-28deg)}}`,
  },
  'story-original-reveal-back': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '580ms',
    frames: `{0%{transform:translate(calc(-17.8022% * var(--wipe-direction)),
        calc(10.9633120dvh * var(--wipe-direction))) rotate(-28deg)}
      100%{transform:translate(calc(-180% * var(--wipe-direction)),
        calc(110.8512517dvh * var(--wipe-direction))) rotate(-28deg)}}`,
  },
  'story-original-reveal-front': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '580ms',
    frames: `{from{transform:translate(calc(17.8022% * var(--wipe-direction)),
        calc(-10.9633120dvh * var(--wipe-direction))) rotate(-28deg)}
      to{transform:translate(calc(-180% * var(--wipe-direction)),
        calc(110.8512517dvh * var(--wipe-direction))) rotate(-28deg)}}`,
  },
  'story-original-reveal-mid': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '580ms',
    frames: `{0%{transform:translate(0,0) rotate(-28deg)}
      100%{transform:translate(calc(-180% * var(--wipe-direction)),
        calc(110.8512517dvh * var(--wipe-direction))) rotate(-28deg)}}`,
  },
  'story-original-type-cover': {
    duration: '440ms',
    frames: `{from{transform:translateX(calc(-45% * var(--row-direction)))}to{transform:translateX(0)}}`,
  },
  'story-original-type-reveal': {
    duration: '580ms',
    frames: `{from{transform:translateX(0)}to{transform:translateX(calc(45% * var(--row-direction)))}}`,
  },
  'story-plane-cover-back': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '440ms',
    frames: `{from{clip-path:${planeClip(WIPE_COMPOSITION.far)}}to{clip-path:${planeClip(-WIPE_COMPOSITION.spread)}}}`,
  },
  'story-plane-cover-front': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '440ms',
    frames: `{from{clip-path:${planeClip(WIPE_COMPOSITION.far)}}to{clip-path:${planeClip(WIPE_COMPOSITION.spread)}}}`,
  },
  'story-plane-cover-mid': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '440ms',
    frames: `{from{clip-path:${planeClip(WIPE_COMPOSITION.far)}}to{clip-path:${planeClip(0)}}}`,
  },
  'story-plane-reveal-back': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '580ms',
    frames: `{from{clip-path:${planeClip(-WIPE_COMPOSITION.spread)}}to{clip-path:${planeClip(-WIPE_COMPOSITION.far)}}}`,
  },
  'story-plane-reveal-front': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '580ms',
    frames: `{from{clip-path:${planeClip(WIPE_COMPOSITION.spread)}}to{clip-path:${planeClip(-WIPE_COMPOSITION.far)}}}`,
  },
  'story-plane-reveal-mid': {
    delay: 'calc(var(--wipe-index) * 32ms)',
    duration: '580ms',
    frames: `{from{clip-path:${planeClip(0)}}to{clip-path:${planeClip(-WIPE_COMPOSITION.far)}}}`,
  },
  'story-reveal': {
    duration: '640ms',
    frames: `{0%,4%{transform:translateX(0) skewX(-12deg)}
      100%{transform:translateX(calc(-115% * var(--wipe-direction))) skewX(-12deg)}}`,
  },
  'story-reveal-back': {
    duration: '640ms',
    frames: `{0%,22%{transform:translateX(0) skewX(-12deg)}
      100%{transform:translateX(calc(-115% * var(--wipe-direction))) skewX(-12deg)}}`,
  },
  'story-reveal-mid': {
    duration: '640ms',
    frames: `{0%,13%{transform:translateX(0) skewX(-12deg)}
      100%{transform:translateX(calc(-115% * var(--wipe-direction))) skewX(-12deg)}}`,
  },
  'story-scene-cover': {
    delay: '64ms',
    duration: '440ms',
    frames: `{from{clip-path:polygon(
      var(--scene-side) 0,calc(50% - 16.6159198vw + (156.8379100vw * var(--wipe-direction))) 0,
      calc(50% + 16.6159198vw + (156.8379100vw * var(--wipe-direction))) 100%,
      var(--scene-side) 100%)}
      to{clip-path:polygon(
      var(--scene-side) 0,calc(50% - 16.6159198vw + (15.5114436vw * var(--wipe-direction))) 0,
      calc(50% + 16.6159198vw + (15.5114436vw * var(--wipe-direction))) 100%,
      var(--scene-side) 100%)}}`,
  },
  'story-scene-reveal': {
    delay: '64ms',
    duration: '580ms',
    frames: `{from{clip-path:polygon(
      var(--scene-side) 0,calc(50% - 16.6159198vw + (15.5114436vw * var(--wipe-direction))) 0,
      calc(50% + 16.6159198vw + (15.5114436vw * var(--wipe-direction))) 100%,
      var(--scene-side) 100%)}
      to{clip-path:polygon(
      var(--scene-side) 0,calc(50% - 16.6159198vw + (-156.8379100vw * var(--wipe-direction))) 0,
      calc(50% + 16.6159198vw + (-156.8379100vw * var(--wipe-direction))) 100%,
      var(--scene-side) 100%)}}`,
  },
  'story-split-cover': {
    delay: 'calc(var(--panel-order) * 70ms)',
    duration: '460ms',
    frames: `{0%{transform:translateY(calc(115% * var(--panel-direction)))}
      100%{transform:translateY(0)}}`,
  },
  'story-split-reveal': {
    delay: 'calc(var(--panel-order) * 70ms)',
    duration: '640ms',
    frames: `{0%{transform:translate(0,0) rotate(0)}
      100%{transform:translate(calc(30% * var(--panel-direction)),calc(130% * var(--panel-direction)))
        rotate(calc(8deg * var(--panel-direction)))}}`,
  },
  'story-title': {
    duration: '920ms',
    frames: `{0%,12%{clip-path:inset(0 100% 0 0);transform:translateX(-12%) skewX(12deg)}
      70%{transform:translateX(2%) skewX(-2deg)}100%{clip-path:inset(0);transform:translateX(0) skewX(0)}}`,
  },
  'story-title-alt': {
    duration: '980ms',
    frames: `{0%,18%{clip-path:inset(0 0 0 100%);transform:translateX(22%) skewX(-16deg)}
      78%{transform:translateX(-2%) skewX(2deg)}100%{clip-path:inset(0);transform:translateX(0) skewX(0)}}`,
  },
  'story-type-cover': {
    duration: '460ms',
    frames: `{0%{transform:translate(24%,-38%) rotate(12deg) scale(1.4)}
      100%{transform:translate(-6%,-50%) rotate(-8deg) scale(1.06)}}`,
  },
  'story-type-reveal': {
    duration: '640ms',
    frames: `{0%{transform:translate(-6%,-50%) rotate(-8deg) scale(1.06)}
      100%{transform:translate(-52%,-62%) rotate(-23deg) scale(1.5)}}`,
  },
}
const storyEntries = Object.entries(STORY_MOTION)

export default defineConfig({
  preflights: [
    {
      getCSS: () => `
      *,*::before,*::after{box-sizing:border-box}
      html{scroll-behavior:smooth;scroll-padding-top:2rem}
      body{margin:0;background:#faf9f6;color:#25232c;line-height:1.6;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
      h1,h2,h3,p{margin:0}button,a{-webkit-tap-highlight-color:transparent}
      button{font:inherit}button:not(:disabled),summary{cursor:pointer}a{color:inherit;text-decoration:none}
      img{display:block;max-width:100%}button{color:inherit}button:disabled{cursor:not-allowed}
      ::selection{background:#ded2f4;color:#25232c}
      :focus-visible{outline:3px solid #7856a6;outline-offset:5px}
      @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}
      *,*::before,*::after{animation:none!important;transition:none!important}}
    `,
    },
  ],
  presets: [presetWind3()],
  shortcuts: {
    'body-copy': 'text-[15px] leading-7 text-muted break-keep',
    'desktop-dock-icon':
      'relative flex h-[clamp(15px,3.1dvh,42px)] w-[clamp(15px,3.1dvh,42px)] items-center ' +
      'justify-center rounded-[25%] shadow-[0_1px_3px_#25232c25]',
    'page-width': 'mx-auto w-full max-w-340 px-6 sm:px-10',
    'section-label': 'text-[11px] font-700 tracking-[0.18em] uppercase text-violet',
    'section-title': 'text-9 sm:text-13 font-750 leading-[1.24] tracking-[-0.055em] text-balance',
    'story-copy-surface': [
      'absolute -inset-x-5 -inset-y-4 bg-white/20 backdrop-blur-md',
      [
        '[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent),',
        'linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)]',
      ].join(''),
      '[mask-composite:intersect]',
    ].join(' '),
    'story-cut-panel': [
      '[clip-path:polygon(0_0,100%_0,100%_14%,97%_17%,97%_21%,100%_18%,',
      '100%_43%,96%_47%,96%_51%,100%_47%,100%_75%,98%_77%,98%_82%,100%_80%,',
      '100%_100%,0_100%,0_86%,3%_83%,3%_79%,0_82%,0_57%,4%_53%,4%_49%,0_53%,',
      '0_28%,2%_26%,2%_21%,0_23%)]',
    ].join(''),
    'story-plane': 'absolute -inset-y-[18%] -left-[42vmax] w-[calc(100%+84vmax)]',
    'story-print-dots': [
      '[background-image:radial-gradient(circle,currentColor_50%,transparent_54%)]',
      '[background-size:clamp(4px,1dvh,8px)_clamp(4px,1dvh,8px)]',
      [
        '[mask-image:radial-gradient(ellipse_at_15%_15%,#000,transparent_60%),',
        'radial-gradient(ellipse_at_85%_85%,#000,transparent_60%)]',
      ].join(''),
    ].join(' '),
    'story-split-bottom': [
      '[clip-path:polygon(0_65.9%,45%_52.9%,48%_49.9%,71%_41.9%,74%_43.9%,',
      '100%_35.9%,100%_100%,0_100%)]',
    ].join(''),
    'story-split-top':
      '[clip-path:polygon(0_0,100%_0,100%_36%,74%_44%,71%_42%,48%_50%,45%_53%,0_66%)]',
  },
  theme: {
    animation: {
      counts: Object.fromEntries(storyEntries.map(([name]) => [name, 1])),
      durations: Object.fromEntries(storyEntries.map(([name, motion]) => [name, motion.duration])),
      keyframes: Object.fromEntries(storyEntries.map(([name, motion]) => [name, motion.frames])),
      properties: Object.fromEntries(
        storyEntries.map(([name, motion]) => [
          name,
          {
            'animation-delay': motion.delay ?? '0ms',
            'animation-fill-mode': 'both',
          },
        ]),
      ),
      timingFns: Object.fromEntries(
        storyEntries.map(([name]) => [name, 'cubic-bezier(0.76,0,0.16,1)']),
      ),
    },
    colors: {
      green: '#285c3b',
      ink: '#25232c',
      lilac: '#eeE8f5',
      lime: '#ded2f4',
      muted: '#6a6672',
      paper: '#faf9f6',
      violet: '#7856a6',
    },
    fontFamily: {sans: '"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'},
  },
})
