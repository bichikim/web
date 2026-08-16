export const POMO_MUSIC_PLAYER_STYLES = String.raw`
.pomo-player-shell {
  box-shadow:
    0 22px 70px rgb(5 4 3 / 46%),
    inset 0 1px 0 rgb(255 255 255 / 10%);
}

.pomo-player__base {
  background: var(--pomo-glass);
}

.pomo-player {
  --media-background-color: transparent;
  --media-control-background: transparent;
  --media-control-hover-background: var(--pomo-secondary-soft);
  --media-control-padding: 0.6rem;
  --media-font-family: inherit;
  --media-primary-color: var(--pomo-text);
  --media-range-bar-color: var(--pomo-secondary);
  --media-range-track-height: 0.2rem;
  --media-secondary-color: transparent;
  display: block;
  width: 100%;
  background: transparent;
}

.pomo-player media-control-bar {
  width: 100%;
  background: transparent;
}

.pomo-player media-play-button,
.pomo-player media-mute-button {
  border-radius: 999px;
}

.pomo-player__play {
  width: 2.75rem;
  height: 2.75rem;
  color: white;
  background: var(--pomo-accent);
  box-shadow:
    0 8px 20px rgb(125 49 29 / 34%),
    inset 0 1px 0 rgb(255 255 255 / 24%);
  transition:
    transform 160ms ease,
    filter 160ms ease;
}

.pomo-player__play--summary {
  overflow: hidden;
  transition:
    width 260ms ease,
    height 260ms ease,
    margin 260ms ease,
    opacity 180ms ease,
    transform 160ms ease,
    filter 160ms ease;
}

.pomo-player__play--summary.is-hidden {
  width: 0;
  height: 0;
  margin-right: -0.75rem;
  opacity: 0;
  pointer-events: none;
}

.pomo-player__play:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.pomo-player__play--large {
  width: 3.25rem;
  height: 3.25rem;
}

.pomo-player__visualizer {
  top: -8px;
  bottom: -8px;
  left: -8px;
  right: -8px;
  filter: blur(8px) saturate(1.25) contrast(1.12);
}

.pomo-level {
  background: var(--pomo-accent);
  box-shadow: 0 0 0.7rem rgb(216 104 69 / 42%);
  transform-origin: center bottom;
}

.pomo-player__title {
  display: block;
  color: var(--pomo-text);
}

.pomo-player__expanded {
  isolation: isolate;
}

.pomo-player__track-title {
  color: #fffaf1;
  font-size: 0.9375rem;
  font-weight: 750;
  line-height: 1.25rem;
  letter-spacing: -0.01em;
}

.pomo-player__track-artist {
  color: #c9c0b5;
  font-size: 0.6875rem;
  line-height: 1rem;
}

.pomo-player__utility,
.pomo-player__skip,
.pomo-player media-mute-button {
  color: var(--pomo-text-muted);
}

.pomo-player__skip:hover,
.pomo-player media-mute-button:hover {
  color: var(--pomo-text);
  background: rgb(255 250 241 / 8%);
}

.pomo-player__expanded {
  background: linear-gradient(
    180deg,
    rgb(0 0 0 / 2%) 0%,
    rgb(0 0 0 / 10%) 34%,
    rgb(0 0 0 / 18%) 100%
  );
  box-shadow: inset 0 -1px 0 rgb(255 250 241 / 4%);
}

.pomo-player media-time-range {
  width: 100%;
  min-width: 7rem;
  height: 1rem;
}

.pomo-player media-volume-range {
  width: clamp(2.5rem, 8vw, 4.5rem);
  min-width: 0;
}

.pomo-player__modes {
  border: 1px solid rgb(255 250 241 / 8%);
  background: rgb(4 4 3 / 22%);
}

.pomo-player__mode {
  color: var(--pomo-text-muted);
}

.pomo-player__mode:hover {
  color: var(--pomo-text);
  background: rgb(255 250 241 / 7%);
}

.pomo-player__mode.is-active {
  color: white;
  background: var(--pomo-accent);
  box-shadow: 0 4px 12px rgb(125 49 29 / 28%);
}

.pomo-player__playlist {
  padding-top: 0.375rem;
  background: linear-gradient(180deg, rgb(255 250 241 / 2%), transparent 1.5rem);
  scrollbar-color: rgb(255 250 241 / 18%) transparent;
  scrollbar-width: thin;
}

.pomo-player__track {
  color: var(--pomo-text-muted);
}

.pomo-player__track[aria-current='true'] {
  color: var(--pomo-text);
  box-shadow: inset 2px 0 0 var(--pomo-accent);
}

.pomo-player__track:focus-visible,
.pomo-player__mode:focus-visible,
.pomo-player__skip:focus-visible,
.pomo-player__utility:focus-visible {
  outline: 2px solid var(--pomo-accent);
  outline-offset: 2px;
}

@media (width < 28rem) {
  .pomo-player__expanded > div:nth-child(2) {
    grid-template-columns: auto 1fr;
  }

  .pomo-player__expanded > div:nth-child(2) > div:last-child {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-level,
  .pomo-player__play,
  .pomo-player__play--summary {
    transition: none;
  }
}
`
