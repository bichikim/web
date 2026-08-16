export const POMO_POMODORO_STYLES = String.raw`
.pomo-pomodoro {
  position: absolute;
  top: calc(1rem + env(safe-area-inset-top));
  left: calc(1rem + env(safe-area-inset-left));
  pointer-events: auto;
}

.pomo-pomodoro__trigger {
  display: inline-flex;
  box-sizing: border-box;
  height: var(--pomo-control-height-medium);
  min-width: 6.75rem;
  align-items: center;
  overflow: visible;
  border-radius: var(--pomo-radius-control);
  background: var(--pomo-glass);
  color: var(--pomo-text);
  box-shadow: var(--pomo-shadow);
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.pomo-pomodoro__emotion-action {
  position: relative;
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: none;
  border: 0;
  border-radius: 50%;
  background: transparent;
  padding: 0;
  color: inherit;
  cursor: pointer;
  outline: none;
  place-items: center;
  transition: background-color 160ms ease;
}

.pomo-pomodoro__action-indicator {
  position: absolute;
  right: -0.3125rem;
  bottom: 0;
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid rgb(255 250 241 / 72%);
  border-radius: 50%;
  background: var(--pomo-text);
  box-shadow: 0 0.125rem 0.25rem rgb(0 0 0 / 36%);
  color: var(--pomo-canvas);
  place-items: center;
  pointer-events: none;
}

.pomo-pomodoro__action-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.pomo-pomodoro__time-action {
  display: grid;
  height: 100%;
  min-width: 3.25rem;
  border: 0;
  border-radius: var(--pomo-radius-control);
  background: transparent;
  padding: 0 0.875rem 0 0.375rem;
  color: inherit;
  cursor: pointer;
  outline: none;
  place-items: center;
  transition: background-color 160ms ease;
}

.pomo-pomodoro__trigger-time {
  color: var(--pomo-text);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: 0.025em;
  line-height: 1rem;
}

.pomo-pomodoro-panel {
  --pomo-timer-phase: var(--pomo-accent);
  display: flex;
  align-items: center;
  flex-direction: column;
}

.pomo-pomodoro-panel[data-phase='longBreak'],
.pomo-pomodoro-panel[data-phase='shortBreak'] {
  --pomo-timer-phase: #8d9a77;
}

.pomo-pomodoro-panel__session-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.pomo-pomodoro-panel__sessions {
  display: flex;
  gap: 0.5rem;
}

.pomo-pomodoro-panel__session {
  width: 0.5rem;
  height: 0.5rem;
  border: 1px solid var(--pomo-border-hover);
  border-radius: 50%;
  background: transparent;
}

.pomo-pomodoro-panel__session[data-complete] {
  border-color: var(--pomo-timer-phase);
  background: var(--pomo-timer-phase);
}

.pomo-pomodoro-panel__session-reset {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 0;
  background: transparent;
  padding: 0.25rem;
  color: var(--pomo-text-muted);
  cursor: pointer;
  font-size: 0.625rem;
  line-height: 0.875rem;
}

.pomo-pomodoro-panel__session-reset:hover,
.pomo-pomodoro-panel__session-reset:focus-visible {
  color: var(--pomo-danger);
}

.pomo-pomodoro-panel__actions {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.625rem;
  margin-top: 1rem;
}

.pomo-pomodoro-panel__primary-action {
  min-width: 0;
  flex: 1;
}

.pomo-pomodoro-panel__compact-action {
  box-shadow: none;
}

.pomo-pomodoro-panel__compact-action--danger {
  border-color: rgb(239 138 116 / 34%);
}

.pomo-pomodoro-panel__compact-action--danger .pomo-icon-button__icon {
  color: var(--pomo-danger);
}

.pomo-pomodoro-panel__auto-start {
  width: 100%;
  box-sizing: border-box;
  margin-top: 1rem;
  border-top: 1px solid var(--pomo-border);
  padding-top: 1rem;
}

.pomo-pomodoro-panel__routine {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin: 1rem 0 0;
  border: 0;
  background: transparent;
  padding: 0.25rem;
  color: var(--pomo-text-muted);
  cursor: pointer;
  font-size: 0.6875rem;
  line-height: 1rem;
  text-align: center;
}

.pomo-pomodoro-panel__routine:hover,
.pomo-pomodoro-panel__routine:focus-visible {
  color: var(--pomo-text);
}

.pomo-pomodoro-panel__duration-editor {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.625rem;
  border: 1px solid var(--pomo-border);
  border-radius: 1rem;
  background: rgb(4 4 3 / 24%);
  padding: 0.75rem;
}

.pomo-pomodoro-panel__duration-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.pomo-pomodoro-panel__duration-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.pomo-pomodoro-panel__duration-field {
  display: grid;
  gap: 0.375rem;
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  font-weight: 650;
  line-height: 1rem;
}

.pomo-pomodoro-panel__duration-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid var(--pomo-border);
  border-radius: 0.625rem;
  background: var(--pomo-glass);
  padding: 0 0.5rem;
  color: var(--pomo-text-muted);
}

.pomo-pomodoro-panel__duration-input:focus-within {
  border-color: var(--pomo-brass);
}

.pomo-pomodoro-panel__duration-input input {
  width: 100%;
  min-width: 0;
  height: 2.25rem;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--pomo-text);
  font-variant-numeric: tabular-nums;
  font-weight: 750;
  outline: none;
}

.pomo-pomodoro-panel__duration-help {
  margin: 0.5rem 0 0;
  color: var(--pomo-text-muted);
  font-size: 0.625rem;
  line-height: 0.875rem;
  text-align: center;
}

@media (width >= 40rem) {
  .pomo-pomodoro {
    top: 1.5rem;
    left: 1.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-pomodoro__emotion-action,
  .pomo-pomodoro__time-action,
  .pomo-pomodoro__trigger {
    transition: none;
  }
}
`
