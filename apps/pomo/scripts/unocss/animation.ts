import {relaxPlayerAnimations} from './relax-player-animations'
import type {PresetWind3Theme} from 'unocss'

export const pomoAnimation = {
  counts: {
    'dialogue-settings-spin': 'infinite',
    'diary-progress-pending': 'infinite',
    'feedback-hold': '1',
    'focus-glow': 'infinite',
    'orbit-border': 'infinite',
    'overflow-marquee': 'infinite',
    ...relaxPlayerAnimations.counts,
    'rest-sway': 'infinite',
    'screen-saver-content-drift': 'infinite',
  },
  durations: {
    'dialogue-menu-in': '140ms',
    'dialogue-settings-spin': '800ms',
    'diary-progress-pending': '1.8s',
    'entry-reveal-room': '700ms',
    'feedback-hold': '2s',
    'focus-glow': '19s',
    'modal-content-in': '180ms',
    'modal-content-in-top': '180ms',
    'modal-overlay-in': '140ms',
    'orbit-border': '3.2s',
    'overflow-marquee': '6s',
    ...relaxPlayerAnimations.durations,
    'rest-sway': '2.4s',
    'screen-saver-content-drift': '48s',
    'select-in': '140ms',
    'toast-enter': '180ms',
    'toast-exit': '180ms',
  },
  keyframes: {
    'dialogue-menu-in': `{
      from { opacity: 0; transform: scale(0.97) translateY(-0.2rem); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }`,
    'dialogue-settings-spin': '{ to { transform: rotate(1turn); } }',
    'diary-progress-pending': '{ to { background-position: 150% 0; } }',
    'entry-reveal-room': '{ from { opacity: 1; } to { opacity: 0; } }',
    // Completion restores temporary feedback without introducing visual motion.
    'feedback-hold': '{ from { opacity: 1; } to { opacity: 1; } }',
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
    'orbit-border': '{ to { transform: rotate(1turn); } }',
    'overflow-marquee': `{
      from { transform: translateX(0); }
      to { transform: translateX(calc(-1 * var(--pomo-marquee-distance))); }
    }`,
    ...relaxPlayerAnimations.keyframes,
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
    'toast-enter': `{
      from { height: 0; margin-bottom: 0; opacity: 0; overflow: hidden; }
      to { height: 2rem; opacity: 1; overflow: hidden; }
    }`,
    'toast-exit': '{ from { height: 2rem; } to { height: 0; margin-bottom: 0; } }',
  },
  properties: {
    'entry-reveal-room': {'animation-fill-mode': 'both'},
    ...relaxPlayerAnimations.properties,
    'screen-saver-content-drift': {'animation-direction': 'alternate'},
    'toast-enter': {'animation-fill-mode': 'backwards'},
    'toast-exit': {'animation-fill-mode': 'forwards'},
  },
  timingFns: {
    'dialogue-menu-in': 'ease-out',
    'dialogue-settings-spin': 'linear',
    'diary-progress-pending': 'ease-in-out',
    'entry-reveal-room': 'cubic-bezier(0.22, 1, 0.36, 1)',
    'focus-glow': 'ease-in-out',
    'modal-content-in': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    'modal-content-in-top': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    'modal-overlay-in': 'ease-out',
    'orbit-border': 'linear',
    'overflow-marquee': 'linear',
    ...relaxPlayerAnimations.timingFns,
    'rest-sway': 'ease-in-out',
    'screen-saver-content-drift': 'ease-in-out',
    'select-in': 'ease-out',
    'toast-enter': 'ease-out',
    'toast-exit': 'ease-out',
  },
} satisfies PresetWind3Theme['animation']
