export const POMO_STUDIO_STYLES = String.raw`
.pomo-loading {
  display: flex;
  height: var(--pomo-control-height-small);
  box-sizing: border-box;
  align-items: center;
  gap: 0.5rem;
  border-radius: var(--pomo-radius-control);
  background: var(--pomo-glass);
  padding: 0 var(--pomo-padding-md);
  color: var(--pomo-text);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1rem;
  box-shadow: var(--pomo-shadow);
}

.pomo-loading__spinner {
  width: 1rem;
  height: 1rem;
  box-sizing: border-box;
  flex: none;
  animation: pomo-loading-spin 1s linear infinite;
  border: 2px solid rgb(255 255 255 / 28%);
  border-top-color: var(--pomo-brass);
  border-radius: var(--pomo-radius-control);
}

.pomo-ui {
  position: absolute;
  inset: 0;
}

.pomo-entry {
  position: absolute;
  inset: 0;
  display: grid;
  background: rgb(7 5 4 / 62%);
  backdrop-filter: blur(0.15rem) saturate(72%);
  color: #fff9f1;
  place-items: center;
}

.pomo-entry__content {
  display: flex;
  width: min(100% - 2rem, 24rem);
  box-sizing: border-box;
  flex-direction: column;
  align-items: center;
  gap: clamp(2.25rem, 7vh, 4rem);
  padding-block: max(2rem, env(safe-area-inset-top)) max(2rem, env(safe-area-inset-bottom));
}

.pomo-entry__mark-stage {
  position: relative;
  display: grid;
  width: min(58vw, 16rem);
  aspect-ratio: 1;
  place-items: center;
}

.pomo-entry__mark {
  position: relative;
  width: 80%;
  height: auto;
  animation: pomo-entry-mark-breathe 5.6s ease-in-out infinite;
  filter: drop-shadow(0 1.5rem 1.5rem rgb(0 0 0 / 42%));
}

.pomo-entry__action {
  min-width: 9.5rem;
}

.pomo-entry__action .pomo-button__leading-image {
  width: 4rem;
  height: 4rem;
  margin-block: -1.25rem;
  margin-inline-start: -0.75rem;
  filter: drop-shadow(0 0.125rem 0.1875rem rgb(0 0 0 / 32%));
}

.pomo-media-dock {
  --pomo-player-compact-width: 7.75rem;
  position: absolute;
  right: max(var(--pomo-padding-lg), env(safe-area-inset-right));
  bottom: max(
    var(--pomo-padding-lg),
    calc(var(--pomo-padding-lg) + env(safe-area-inset-bottom))
  );
  left: max(var(--pomo-padding-lg), env(safe-area-inset-left));
  display: flex;
  height: calc(
    100dvh - var(--pomo-padding-lg) - var(--pomo-padding-lg) - env(safe-area-inset-top) -
      env(safe-area-inset-bottom)
  );
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  pointer-events: none;
  gap: var(--pomo-padding-md);
}

.pomo-media-dock .pomo-player-stage {
  position: relative;
  inset: auto;
  width: min(29rem, 100%);
  flex: none;
  pointer-events: auto;
  transition: width 180ms ease;
}

.pomo-media-messages {
  display: flex;
  width: min(36rem, 100%);
  min-height: 0;
  max-height: 100%;
  flex: 0 1 auto;
  flex-direction: column;
  gap: var(--pomo-padding-md);
  overflow: hidden;
  pointer-events: none;
}

.pomo-media-messages > * {
  pointer-events: auto;
}

.pomo-media-dock .pomo-dialogue-bubble {
  width: 100%;
  max-height: 100%;
  flex: 0 1 auto;
  pointer-events: auto;
}

.pomo-media-dock[data-dialogue-active]:not([data-player-expanded]) .pomo-player-stage {
  width: var(--pomo-player-compact-width);
}

.pomo-media-dock[data-dialogue-active]:not([data-player-expanded]) .pomo-player__title {
  display: none;
}

@keyframes pomo-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pomo-entry-mark-breathe {
  0%,
  100% {
    transform: translateY(0) rotate(-0.5deg);
  }

  50% {
    transform: translateY(-0.65rem) rotate(0.5deg);
  }
}

@media (width < 40rem) {
  .pomo-scene-control.pomo-icon-button,
  .pomo-scene-control.pomo-icon-select {
    display: none;
  }
}

@media (width >= 40rem) {
  .pomo-media-dock {
    right: max(1.5rem, env(safe-area-inset-right));
    bottom: max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)));
    left: max(1.5rem, env(safe-area-inset-left));
    height: calc(100dvh - 3rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-entry__mark {
    animation: none;
  }

  .pomo-media-dock .pomo-player-stage {
    transition: none;
  }

  .pomo-loading__spinner {
    animation: none;
  }
}
`
