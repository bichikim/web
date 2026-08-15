export const POMO_SCREEN_SAVER_STYLES = String.raw`
.pomo-screen-saver {
  width: 100vw;
  max-width: none;
  height: 100dvh;
  max-height: none;
  box-sizing: border-box;
  margin: 0;
  border: 0;
  background: #000;
  padding: max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right))
    max(1.5rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
  color: rgb(255 255 255 / 48%);
  cursor: pointer;
  outline: none;
  overscroll-behavior: none;
}

.pomo-screen-saver::backdrop {
  background: #000;
}

.pomo-screen-saver__safe-area {
  position: absolute;
  inset: max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right))
    max(1.5rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left));
  display: grid;
  place-items: center;
  pointer-events: none;
}

.pomo-screen-saver__content {
  display: grid;
  width: min(calc(100% - 4rem), 22rem);
  justify-items: center;
  gap: 1.25rem;
  animation: pomo-screen-saver-content-drift 48s ease-in-out infinite alternate;
  text-align: center;
}

.pomo-screen-saver__timer {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
}

.pomo-screen-saver__timer > span {
  color: rgb(255 255 255 / 46%);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.125rem;
}

.pomo-screen-saver__timer > strong {
  color: rgb(255 255 255 / 52%);
  font-size: clamp(3rem, 16vw, 5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1;
}

.pomo-screen-saver__track {
  display: grid;
  max-width: 100%;
  gap: 0.25rem;
}

.pomo-screen-saver__track > p {
  overflow: hidden;
  margin: 0;
  color: rgb(255 255 255 / 48%);
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.25rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pomo-screen-saver__track > span,
.pomo-screen-saver__hint {
  color: rgb(255 255 255 / 46%);
  font-size: 0.75rem;
  line-height: 1.125rem;
}

.pomo-screen-saver__hint {
  margin: 0.5rem 0 0;
  font-weight: 600;
}

@keyframes pomo-screen-saver-content-drift {
  0% {
    transform: translate(-2rem, -1.5rem);
  }

  33% {
    transform: translate(1.75rem, -0.75rem);
  }

  66% {
    transform: translate(-1rem, 1.5rem);
  }

  100% {
    transform: translate(2rem, 0.75rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-screen-saver__content {
    animation-duration: 64s;
    animation-timing-function: steps(4, jump-none);
  }
}
`
