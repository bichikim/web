import baseConfig from '@winter-love/unocss-config'
import {defineConfig, mergeConfigs, presetIcons, type PresetWind3Theme, type Variant} from 'unocss'

import scribbleIcons from './scripts/unocss/scribble.json'
import albumData from './public/audio/albums.json'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const sansFontFamily = [
  "'Pretendard Variable'",
  'Pretendard',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  "'Segoe UI'",
  "'Apple SD Gothic Neo'",
  "'Noto Sans KR'",
  "'Malgun Gothic'",
  'sans-serif',
].join(', ')

const colors = isAppsInToss
  ? {
      backdrop: 'rgb(25 31 40 / 48%)',
      background: '#f7f8fa',
      border: 'rgb(2 32 71 / 16%)',
      'border-hover': 'rgb(2 32 71 / 28%)',
      danger: '#b42318',
      foreground: '#191f28',
      highlight: '#8a5a32',
      'muted-foreground': '#4e5968',
      primary: '#c34f2f',
      'primary-soft': 'rgb(195 79 47 / 12%)',
      'primary-strong': '#a83b20',
      'primary-strong-hover': '#8f2f18',
      secondary: '#667052',
      'secondary-soft': 'rgb(102 112 82 / 14%)',
      'secondary-strong': '#525b41',
      surface: 'rgb(255 255 255 / 88%)',
      'surface-interactive': 'rgb(255 255 255 / 98%)',
      'surface-overlay': 'rgb(25 31 40 / 10%)',
      'surface-strong': '#ffffff',
    }
  : {
      backdrop: 'rgb(8 6 4 / 68%)',
      background: '#17130f',
      border: 'rgb(255 250 241 / 14%)',
      'border-hover': 'rgb(255 250 241 / 28%)',
      danger: '#ef8a74',
      foreground: '#fffaf1',
      highlight: '#d9b98a',
      'muted-foreground': '#c9c0b5',
      primary: '#d86845',
      'primary-soft': 'rgb(216 104 69 / 18%)',
      'primary-strong': '#a94329',
      'primary-strong-hover': '#b84f32',
      secondary: '#727b60',
      'secondary-soft': 'rgb(114 123 96 / 20%)',
      'secondary-strong': '#5f684e',
      surface: 'rgb(10 10 10 / 68%)',
      'surface-interactive': 'rgb(10 10 10 / 78%)',
      'surface-overlay': 'rgb(10 10 10 / 31.25%)',
      'surface-strong': 'rgb(10 10 10 / 68%)',
    }

const INITIAL_SCENE_FALLBACK_SHORTCUTS = {
  'pomo-loading':
    'flex min-h-control-sm box-border items-center gap-2 rounded-control bg-surface py-0 px-3 ' +
    'text-foreground text-xs font-650 leading-4 shadow-panel',
  'pomo-loading__spinner':
    'w-4 h-4 box-border flex-none animate-spin [border:2px_solid_rgb(255_255_255_/_28%)] ' +
    'border-t-highlight rounded-control motion-reduce:animate-[none]',
  'pomo-scene-fallback':
    'pointer-events-none absolute inset-0 grid place-items-center text-foreground',
  'pomo-scene-fallback__panel':
    'border border-solid border-border rounded-control backdrop-blur-surface',
} as const

const createParentVariant = (name: string, parent: string): Variant => {
  return (matcher) => {
    const prefix = `${name}:`

    if (!matcher.startsWith(prefix)) {
      return
    }

    return {
      matcher: matcher.slice(prefix.length),
      parent,
    }
  }
}

const isPresetNamed = (preset: unknown, name: string) =>
  typeof preset === 'object' && preset !== null && 'name' in preset && preset.name === name

const config = mergeConfigs([
  baseConfig,
  defineConfig<PresetWind3Theme>({
    content: {
      pipeline: {
        exclude: ['**/.i18n/paraglide/**'],
      },
    },
    extendTheme: (theme) => {
      const spacing = (units: string) => `calc(${theme.spacing?.DEFAULT ?? '1rem'} / 4 * ${units})`
      const controlMedium = spacing('11')
      const controlSmall = spacing('8')
      const layoutSpacing = spacing('6')
      const mobileLayoutSpacing = spacing('4')
      const modalSpacing = spacing('8')
      const modalSpacingCompact = spacing('5')
      const panelInset = spacing('2')
      const panelRadius = theme.borderRadius?.panel ?? '1.25rem'
      const safeAreaBottom = 'var(--pomo-safe-area-inset-bottom)'
      const safeAreaLeft = 'var(--pomo-safe-area-inset-left)'
      const safeAreaRight = 'var(--pomo-safe-area-inset-right)'
      const safeAreaTop = 'var(--pomo-safe-area-inset-top)'

      theme.borderRadius = {
        ...theme.borderRadius,
        'panel-inner': `calc(${panelRadius} - ${panelInset})`,
      }
      theme.height = {
        ...theme.height,
        'control-md': controlMedium,
        'control-sm': controlSmall,
      }
      theme.maxHeight = {
        ...theme.maxHeight,
        modal: `calc(100dvh - (${layoutSpacing} * 2) - ${safeAreaTop} - ${safeAreaBottom})`,
        'modal-top': `calc(100dvh - ${safeAreaTop} - ${safeAreaBottom} - (${modalSpacing} * 2))`,
        'modal-top-compact': `calc(100dvh - ${safeAreaTop} - ${safeAreaBottom} - (${modalSpacingCompact} * 2))`,
      }
      theme.minHeight = {
        ...theme.minHeight,
        'control-md': controlMedium,
        'control-sm': controlSmall,
      }
      theme.minWidth = {
        ...theme.minWidth,
        'control-md': controlMedium,
        'control-sm': controlSmall,
      }
      theme.spacing = {
        ...theme.spacing,
        layout: layoutSpacing,
        'layout-mobile': mobileLayoutSpacing,
        'modal-top': `calc(${safeAreaTop} + ${modalSpacing})`,
        'modal-top-compact': `calc(${safeAreaTop} + ${modalSpacingCompact})`,
        'player-bottom': `calc(${layoutSpacing} + ${safeAreaBottom})`,
        'player-bottom-mobile': `calc(${mobileLayoutSpacing} + ${safeAreaBottom})`,
        'safe-bottom': `max(${layoutSpacing}, calc(${layoutSpacing} + ${safeAreaBottom}))`,
        'safe-bottom-mobile': `max(${mobileLayoutSpacing}, calc(${mobileLayoutSpacing} + ${safeAreaBottom}))`,
        'safe-left': `max(${layoutSpacing}, ${safeAreaLeft})`,
        'safe-left-mobile': `max(${mobileLayoutSpacing}, ${safeAreaLeft})`,
        'safe-right': `max(${layoutSpacing}, ${safeAreaRight})`,
        'safe-right-mobile': `max(${mobileLayoutSpacing}, ${safeAreaRight})`,
      }
      theme.width = {
        ...theme.width,
        'control-md': controlMedium,
        'control-sm': controlSmall,
      }
    },
    preflights: [
      {
        getCSS: ({theme}) => `
:root {
  --pomo-safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --pomo-safe-area-inset-left: env(safe-area-inset-left, 0px);
  --pomo-safe-area-inset-right: env(safe-area-inset-right, 0px);
  --pomo-safe-area-inset-top: env(safe-area-inset-top, 0px);
  --pomo-color-foreground: ${theme.colors?.foreground};
  --pomo-color-muted-foreground: ${theme.colors?.['muted-foreground']};
  --pomo-color-range-track: ${isAppsInToss ? 'rgb(25 31 40 / 22%)' : 'rgb(255 250 241 / 22%)'};
  --pomo-color-secondary-soft: ${theme.colors?.['secondary-soft']};
  color-scheme: ${isAppsInToss ? 'light' : 'dark'};
  font-family: ${theme.fontFamily?.sans};
  background: ${theme.colors?.background};
  color: ${theme.colors?.foreground};
}

html,
body,
#root {
  min-height: 100%;
}

body {
  min-height: 100dvh;
}

:focus-visible {
  outline: 2px solid ${theme.colors?.primary};
  outline-offset: 3px;
}
`,
      },
    ],
    // The SSR fallback must be styled before lazy client modules extend the generated CSS.
    safelist: [
      ...Object.keys(INITIAL_SCENE_FALLBACK_SHORTCUTS),
      ...albumData.albums.map((album) => album.icon),
    ],
    shortcuts: INITIAL_SCENE_FALLBACK_SHORTCUTS,
    theme: {
      animation: {
        counts: {
          'dialogue-settings-spin': 'infinite',
          'focus-glow': 'infinite',
          'overflow-marquee': 'infinite',
          'rest-sway': 'infinite',
          'screen-saver-content-drift': 'infinite',
        },
        durations: {
          'dialogue-menu-in': '140ms',
          'dialogue-settings-spin': '800ms',
          'entry-reveal-room': '700ms',
          'focus-glow': '19s',
          'modal-content-in': '180ms',
          'modal-content-in-top': '180ms',
          'modal-overlay-in': '140ms',
          'overflow-marquee': '6s',
          'rest-sway': '2.4s',
          'screen-saver-content-drift': '48s',
          'select-in': '140ms',
        },
        keyframes: {
          'dialogue-menu-in': `{
            from { opacity: 0; transform: scale(0.97) translateY(-0.2rem); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }`,
          'dialogue-settings-spin': '{ to { transform: rotate(1turn); } }',
          'entry-reveal-room': '{ from { opacity: 1; } to { opacity: 0; } }',
          'focus-glow': `{
            0% { transform: scale(0); }
            2% { transform: translateY(-0.0625rem) rotate(-6deg) scale(1.12); }
            4%, 18% { transform: none; }
            19% { transform: scale(0.68); }
            20% { transform: scale(0.28); }
            21% { transform: scale(0); }
            22% { transform: translate3d(-0.1875rem, 0.125rem, 0) scale(0); }
            24% { transform: translate3d(-0.1875rem, 0.125rem, 0) rotate(-6deg) scale(1.12); }
            26%, 43% { transform: translate3d(-0.1875rem, 0.125rem, 0) rotate(-4deg) scale(1); }
            44% { transform: translate3d(-0.1875rem, 0.125rem, 0) rotate(-4deg) scale(0.68); }
            45% { transform: translate3d(-0.1875rem, 0.125rem, 0) rotate(-4deg) scale(0.28); }
            46% { transform: translate3d(-0.1875rem, 0.125rem, 0) rotate(-4deg) scale(0); }
            47% { transform: translate3d(0.125rem, -0.1875rem, 0) scale(0); }
            49% { transform: translate3d(0.125rem, -0.1875rem, 0) rotate(7deg) scale(1.12); }
            51%, 74% { transform: translate3d(0.125rem, -0.1875rem, 0) rotate(5deg) scale(1); }
            75% { transform: translate3d(0.125rem, -0.1875rem, 0) rotate(5deg) scale(0.68); }
            76% { transform: translate3d(0.125rem, -0.1875rem, 0) rotate(5deg) scale(0.28); }
            77% { transform: translate3d(0.125rem, -0.1875rem, 0) rotate(5deg) scale(0); }
            78% { transform: translate3d(-0.0625rem, -0.0625rem, 0) scale(0); }
            80% { transform: translate3d(-0.0625rem, -0.0625rem, 0) rotate(-5deg) scale(1.12); }
            82%, 97% { transform: translate3d(-0.0625rem, -0.0625rem, 0) rotate(-2deg) scale(1); }
            98% { transform: translate3d(-0.0625rem, -0.0625rem, 0) rotate(-2deg) scale(0.68); }
            99% { transform: translate3d(-0.0625rem, -0.0625rem, 0) rotate(-2deg) scale(0.28); }
            100% { transform: translate3d(-0.0625rem, -0.0625rem, 0) rotate(-2deg) scale(0); }
          }`,
          'modal-content-in': `{
            from { opacity: 0; transform: translate(-50%, calc(-50% + 0.5rem)) scale(0.98); }
          }`,
          'modal-content-in-top': `{
            from { opacity: 0; transform: translate(-50%, 0.5rem) scale(0.98); }
          }`,
          'modal-overlay-in': '{ from { opacity: 0; } }',
          'overflow-marquee': `{
            from { transform: translateX(0); }
            to { transform: translateX(calc(-1 * var(--pomo-marquee-distance))); }
          }`,
          'rest-sway': `{
            0%, 100% { transform: translate3d(0, 0, 0) rotate(-8deg); }
            50% { transform: translate3d(0.0625rem, -0.125rem, 0) rotate(9deg); }
          }`,
          'screen-saver-content-drift': `{
            0% { transform: translate(-2rem, -1.5rem); }
            33% { transform: translate(1.75rem, -0.75rem); }
            66% { transform: translate(-1rem, 1.5rem); }
            100% { transform: translate(2rem, 0.75rem); }
          }`,
          'select-in': `{
            from { opacity: 0; transform: scale(0.97) translateY(-0.25rem); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }`,
        },
        properties: {
          'entry-reveal-room': {'animation-fill-mode': 'both'},
          'screen-saver-content-drift': {'animation-direction': 'alternate'},
        },
        timingFns: {
          'dialogue-menu-in': 'ease-out',
          'dialogue-settings-spin': 'linear',
          'entry-reveal-room': 'cubic-bezier(0.22, 1, 0.36, 1)',
          'focus-glow': 'ease-in-out',
          'modal-content-in': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          'modal-content-in-top': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          'modal-overlay-in': 'ease-out',
          'overflow-marquee': 'linear',
          'rest-sway': 'ease-in-out',
          'screen-saver-content-drift': 'ease-in-out',
          'select-in': 'ease-out',
        },
      },
      blur: {
        surface: '8px',
      },
      borderRadius: {
        control: '999px',
        panel: '1.25rem',
      },
      boxShadow: {
        focus: `0 0 0 2px ${colors.highlight}`,
        panel: isAppsInToss ? '0 18px 54px rgb(25 31 40 / 16%)' : '0 18px 54px rgb(8 6 4 / 42%)',
        'tab-active': `inset 0 -0.1875rem 0 ${colors.highlight}`,
        'track-active': `inset 2px 0 0 ${colors.primary}`,
      },
      breakpoints: {
        '2xl': '64rem',
        lg: '40rem',
        md: '36rem',
        sm: '28rem',
        xl: '48rem',
        xs: '24rem',
      },
      colors,
      fontFamily: {
        sans: sansFontFamily,
      },
    },
    variants: [
      createParentVariant('player-compact', '@container pomo-player (width < 24rem)'),
      createParentVariant(
        'dialogue-library-compact',
        '@container pomo-dialogue-library-item (width < 19rem)',
      ),
      createParentVariant('settings-compact', '@media (width < 42rem)'),
      createParentVariant('feed-status-compact', '@media (width < 34rem)'),
      createParentVariant('automatic-dialogue-compact', '@media (width < 32rem)'),
      createParentVariant('dialogue-controls-readable', '@media (width >= 23.0625rem)'),
      createParentVariant('dialogue-controls-wide', '@media (width >= 34.0625rem)'),
    ],
  }),
])

config.presets = [
  ...(config.presets ?? []).filter((preset) => !isPresetNamed(preset, '@unocss/preset-icons')),
  presetIcons({
    collections: {
      'pomo-scribble': () => scribbleIcons,
    },
  }),
]

export default config
