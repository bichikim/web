export const POMO_SETTINGS_STYLES = String.raw`
.pomo-settings__content {
  display: grid;
  gap: 1.25rem;
}

.pomo-settings__scene {
  display: grid;
  gap: 1rem;
  padding-bottom: var(--pomo-padding-xl);
  border-bottom: 1px solid var(--pomo-border);
}

.pomo-settings__wake-lock {
  min-height: 3rem;
}

.pomo-settings__screen-saver {
  display: grid;
  gap: 0.5rem;
  padding-top: var(--pomo-padding-lg);
  border-top: 1px solid var(--pomo-border);
}

.pomo-settings__screen-saver > div {
  width: 100%;
}

.pomo-settings__screen-saver p {
  margin: 0;
  color: var(--pomo-text-muted);
  font-size: 0.75rem;
  line-height: 1.125rem;
}

@media (width >= 40rem) {
  .pomo-settings__scene {
    display: none;
  }
}

`
