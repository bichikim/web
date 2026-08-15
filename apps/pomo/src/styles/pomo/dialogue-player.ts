export const POMO_DIALOGUE_PLAYER_STYLES = String.raw`
.pomo-dialogue-bubble {
  width: 100%;
  min-height: 0;
  max-height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border-width: 1px;
  border-style: solid;
  border-radius: 1rem;
  padding: var(--pomo-padding-lg);
  color: var(--pomo-text);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%);
  backdrop-filter: blur(0.75rem);
  -webkit-backdrop-filter: blur(0.75rem);
}

.pomo-dialogue-bubble:not(.pomo-dialogue-bubble--play) {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  row-gap: var(--pomo-padding-sm);
}

.pomo-dialogue-bubble__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pomo-padding-md);
}

.pomo-dialogue-bubble__speaker-group {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--pomo-padding-sm);
}

.pomo-dialogue-bubble__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--pomo-padding-xs);
}

.pomo-dialogue-bubble__speaker {
  display: block;
  color: var(--pomo-brass);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.pomo-dialogue-bubble__progress {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--pomo-padding-xs);
}

.pomo-dialogue-bubble__progress-dot {
  width: 0.375rem;
  height: 0.375rem;
  box-sizing: border-box;
  flex: none;
  border: 1px solid var(--pomo-border-hover);
  border-radius: 50%;
  background: transparent;
}

.pomo-dialogue-bubble__progress-dot[data-complete] {
  border-color: var(--pomo-brass);
  background: var(--pomo-brass);
}

.pomo-dialogue-bubble__stop,
.pomo-dialogue-bubble__skip {
  flex: none;
  white-space: nowrap;
}

.pomo-dialogue-bubble p {
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding-right: var(--pomo-padding-xs);
  font-size: clamp(0.9rem, 2.5vw, 1rem);
  line-height: 1.65;
  overscroll-behavior: contain;
  scrollbar-color: rgb(255 250 241 / 24%) transparent;
  scrollbar-width: thin;
}

.pomo-dialogue-bubble--play {
  display: flex;
  cursor: pointer;
  align-items: center;
  gap: var(--pomo-padding-md);
  font: inherit;
  text-align: left;
}

.pomo-dialogue-bubble__play-icon {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: var(--pomo-secondary-soft);
  color: var(--pomo-brass);
}

.pomo-dialogue-bubble--play > span:last-child {
  display: grid;
  gap: var(--pomo-padding-xs);
}

.pomo-dialogue-bubble--play strong {
  font-size: 0.8125rem;
}

.pomo-dialogue-bubble--play small {
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

`
