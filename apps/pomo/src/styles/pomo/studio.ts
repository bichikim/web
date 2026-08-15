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
  display: flex;
  align-items: flex-end;
  background: radial-gradient(
    ellipse 125% 105% at 0% 108%,
    rgb(7 5 4 / 94%) 0%,
    rgb(7 5 4 / 82%) 28%,
    rgb(7 5 4 / 58%) 54%,
    rgb(7 5 4 / 30%) 74%,
    transparent 92%
  );
  color: #fff9f1;
}

.pomo-entry[data-exiting] {
  animation: pomo-entry-reveal-room 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
  pointer-events: none;
}

.pomo-entry__content {
  display: flex;
  width: min(calc(100% - 2rem - env(safe-area-inset-left)), 22rem);
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  margin-block-end: calc(1.5rem + env(safe-area-inset-bottom));
  margin-inline-start: calc(1rem + env(safe-area-inset-left));
}

button.pomo-entry__action {
  min-width: min(17rem, 100%);
  min-height: 3.5rem;
  padding-inline: 1.5rem;
  font-size: 0.9375rem;
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

@keyframes pomo-entry-reveal-room {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@media (width < 40rem) {
  .pomo-scene-control.pomo-icon-button,
  .pomo-scene-control.pomo-icon-select {
    display: none;
  }
}

@media (width >= 40rem) {
  .pomo-entry__content {
    margin-block-end: calc(2.5rem + env(safe-area-inset-bottom));
    margin-inline-start: calc(2.5rem + env(safe-area-inset-left));
  }

  .pomo-media-dock {
    right: max(1.5rem, env(safe-area-inset-right));
    bottom: max(1.5rem, calc(1.5rem + env(safe-area-inset-bottom)));
    left: max(1.5rem, env(safe-area-inset-left));
    height: calc(100dvh - 3rem - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-entry[data-exiting] {
    animation-duration: 1ms;
  }

  .pomo-media-dock .pomo-player-stage {
    transition: none;
  }

  .pomo-loading__spinner {
    animation: none;
  }
}
`
