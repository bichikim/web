import baseConfig from '@winter-love/unocss-config'
import {defineConfig, mergeConfigs, type PresetWind3Theme} from 'unocss'

export default mergeConfigs([
  baseConfig,
  defineConfig<PresetWind3Theme>({
    extendTheme: (theme) => {
      const spacing = (units: string) => `calc(${theme.spacing?.DEFAULT ?? '1rem'} / 4 * ${units})`
      const controlMedium = spacing('11')
      const controlSmall = spacing('8')
      const layoutSpacing = spacing('4')
      const layoutSpacingWide = spacing('6')
      const modalSpacing = spacing('8')
      const modalSpacingCompact = spacing('5')
      const panelInset = spacing('2')
      const panelRadius = theme.borderRadius?.panel ?? '1.25rem'

      theme.borderRadius = {
        ...theme.borderRadius,
        'panel-inner': `calc(${panelRadius} - ${panelInset})`,
      }
      theme.height = {
        ...theme.height,
        'control-md': controlMedium,
        'control-sm': controlSmall,
        'media-dock':
          `calc(100dvh - ${layoutSpacing} - ${layoutSpacing} - ` +
          'env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        'media-dock-wide':
          `calc(100dvh - ${layoutSpacingWide} - ${layoutSpacingWide} - ` +
          'env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      }
      theme.maxHeight = {
        ...theme.maxHeight,
        modal:
          `calc(100dvh - (${layoutSpacing} * 2) - ` +
          'env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        'modal-top': `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - (${modalSpacing} * 2))`,
        'modal-top-compact':
          'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ' +
          `(${modalSpacingCompact} * 2))`,
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
        'modal-top': `calc(env(safe-area-inset-top) + ${modalSpacing})`,
        'modal-top-compact': `calc(env(safe-area-inset-top) + ${modalSpacingCompact})`,
        'player-bottom': `calc(${layoutSpacing} + env(safe-area-inset-bottom))`,
        'safe-bottom': `max(${layoutSpacing}, calc(${layoutSpacing} + env(safe-area-inset-bottom)))`,
        'safe-bottom-wide': `max(${layoutSpacingWide}, calc(${layoutSpacingWide} + env(safe-area-inset-bottom)))`,
        'safe-left': `max(${layoutSpacing}, env(safe-area-inset-left))`,
        'safe-left-wide': `max(${layoutSpacingWide}, env(safe-area-inset-left))`,
        'safe-right': `max(${layoutSpacing}, env(safe-area-inset-right))`,
        'safe-right-wide': `max(${layoutSpacingWide}, env(safe-area-inset-right))`,
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
  color-scheme: dark;
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
        focus: '0 0 0 2px #d9b98a',
        panel: '0 18px 54px rgb(8 6 4 / 42%)',
        'tab-active': 'inset 0 -0.1875rem 0 #d9b98a',
        'track-active': 'inset 2px 0 0 #d86845',
      },
      colors: {
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
      },
      fontFamily: {
        sans: "Inter, Pretendard, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      },
    },
    variants: [
      (matcher) => {
        const prefix = 'dialogue-library-compact:'

        if (!matcher.startsWith(prefix)) {
          return
        }

        return {
          matcher: matcher.slice(prefix.length),
          parent: '@container pomo-dialogue-library-item (width < 19rem)',
        }
      },
    ],
  }),
])
