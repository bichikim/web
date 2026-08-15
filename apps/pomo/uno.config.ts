import baseConfig from '@winter-love/unocss-config'

import {POMO_COMPONENT_PREFLIGHT} from './src/styles/pomo-component-preflight'

const POMO_CONFIG_DEPENDENCIES = [
  './src/styles/pomo-component-preflight.ts',
  './src/styles/pomo/dialogue-editor.ts',
  './src/styles/pomo/dialogue-player.ts',
  './src/styles/pomo/dialogue-settings.ts',
  './src/styles/pomo/feed-settings.ts',
  './src/styles/pomo/feed-status.ts',
  './src/styles/pomo/music-player.ts',
  './src/styles/pomo/pomodoro.ts',
  './src/styles/pomo/screen-saver.ts',
  './src/styles/pomo/settings.ts',
  './src/styles/pomo/studio.ts',
] as const

const POMO_PREFLIGHT = `
:root {
  --pomo-canvas: #17130f;
  --pomo-glass: rgb(10 10 10 / 68%);
  --pomo-glass-interactive: rgb(10 10 10 / 78%);
  --pomo-glass-interactive-overlay: rgb(10 10 10 / 31.25%);
  --pomo-surface: var(--pomo-glass);
  --pomo-surface-strong: var(--pomo-glass);
  --pomo-border: rgb(255 250 241 / 14%);
  --pomo-border-hover: rgb(255 250 241 / 28%);
  --pomo-text: #fffaf1;
  --pomo-text-muted: #c9c0b5;
  --pomo-brass: #d9b98a;
  --pomo-secondary: #727b60;
  --pomo-secondary-strong: #5f684e;
  --pomo-secondary-soft: rgb(114 123 96 / 20%);
  --pomo-moss: var(--pomo-secondary);
  --pomo-accent: #d86845;
  --pomo-accent-strong: #a94329;
  --pomo-accent-strong-hover: #b84f32;
  --pomo-accent-soft: rgb(216 104 69 / 18%);
  --pomo-danger: #ef8a74;
  --pomo-backdrop-blur: 8px;
  --pomo-shadow: 0 18px 54px rgb(8 6 4 / 42%);
  --pomo-control-height-small: 2rem;
  --pomo-control-height-medium: 2.75rem;
  --pomo-radius-panel: 1.25rem;
  --pomo-radius-control: 999px;
  --pomo-space-1: 0.25rem;
  --pomo-space-2: 0.5rem;
  --pomo-space-3: 0.75rem;
  --pomo-space-4: 1rem;
  --pomo-space-5: 1.25rem;
  --pomo-space-6: 1.5rem;
  --pomo-space-8: 2rem;
  --pomo-padding-xs: var(--pomo-space-1);
  --pomo-padding-sm: var(--pomo-space-2);
  --pomo-padding-md: var(--pomo-space-3);
  --pomo-padding-lg: var(--pomo-space-4);
  --pomo-padding-xl: var(--pomo-space-5);
}

@media (width < 40rem) {
  :root {
    --pomo-padding-xs: 0.1875rem;
    --pomo-padding-sm: 0.375rem;
    --pomo-padding-md: 0.5625rem;
    --pomo-padding-lg: 0.75rem;
    --pomo-padding-xl: 0.9375rem;
  }
}

@keyframes pomo-select-in {
  from { opacity: 0; transform: scale(0.97) translateY(-0.25rem); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes pomo-modal-overlay-in {
  from { opacity: 0; }
}

@keyframes pomo-modal-content-in {
  from { opacity: 0; transform: translate(-50%, calc(-50% + 0.5rem)) scale(0.98); }
}

@keyframes pomo-modal-content-in-top {
  from { opacity: 0; transform: translate(-50%, 0.5rem) scale(0.98); }
}

@keyframes pomo-focus-glow {
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
}

@keyframes pomo-rest-sway {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-8deg); }
  50% { transform: translate3d(0.0625rem, -0.125rem, 0) rotate(9deg); }
}
`

const BASE_SHORTCUTS = Array.isArray(baseConfig.shortcuts)
  ? baseConfig.shortcuts
  : baseConfig.shortcuts === undefined
    ? []
    : [baseConfig.shortcuts]

export default {
  ...baseConfig,
  configDeps: [...(baseConfig.configDeps ?? []), ...POMO_CONFIG_DEPENDENCIES],
  preflights: [
    ...(baseConfig.preflights ?? []),
    {
      getCSS: () => POMO_PREFLIGHT,
    },
    {
      getCSS: () => POMO_COMPONENT_PREFLIGHT,
    },
  ],
  shortcuts: [
    ...BASE_SHORTCUTS,
    {
      'pomo-backdrop':
        'border border-solid border-[var(--pomo-border)] backdrop-blur-[var(--pomo-backdrop-blur)]',
      'pomo-interactive-glass':
        'hover:border-[var(--pomo-border-hover)] hover:bg-[var(--pomo-glass-interactive)] focus-visible:border-[var(--pomo-brass)] focus-visible:bg-[var(--pomo-glass-interactive)] ui-expanded:border-[var(--pomo-brass)] ui-expanded:bg-[var(--pomo-glass-interactive)]',
      'pomo-static-focus-glass': 'border-[var(--pomo-brass)] bg-[var(--pomo-glass-interactive)]',
      'pomo-interactive-glass-part':
        '[&:not(.pomo-interactive-glass-group-trigger):hover]:bg-[var(--pomo-glass-interactive-overlay)] [&:not(.pomo-interactive-glass-group-trigger):focus-visible]:bg-[var(--pomo-glass-interactive-overlay)] [&:not(.pomo-interactive-glass-group-trigger)[data-expanded]]:bg-[var(--pomo-glass-interactive-overlay)]',
      'pomo-interactive-glass-group':
        '[&:has(.pomo-interactive-glass-part:hover)]:border-[var(--pomo-border-hover)] [&:has(.pomo-interactive-glass-part:focus-visible)]:border-[var(--pomo-brass)] [&:has(.pomo-interactive-glass-part[data-expanded])]:border-[var(--pomo-brass)] [&:has(.pomo-interactive-glass-group-trigger:hover)]:bg-[var(--pomo-glass-interactive)] [&:has(.pomo-interactive-glass-group-trigger:focus-visible)]:bg-[var(--pomo-glass-interactive)] [&:has(.pomo-interactive-glass-group-trigger[data-expanded])]:bg-[var(--pomo-glass-interactive)]',
      'pomo-strong-focus-ring':
        'focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-[var(--pomo-brass)]',
    },
  ],
}
