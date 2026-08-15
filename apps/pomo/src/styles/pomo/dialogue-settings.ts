export const POMO_DIALOGUE_SETTINGS_STYLES = String.raw`
.pomo-dialogue-settings {
  display: grid;
  gap: 1.125rem;
}

.pomo-dialogue-settings__audio {
  display: none;
}

.pomo-dialogue-settings__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.pomo-dialogue-settings__heading > div {
  min-width: 0;
}

.pomo-dialogue-settings__heading h3,
.pomo-dialogue-settings__library-heading h4 {
  margin: 0;
  color: var(--pomo-text);
  font-size: 0.9375rem;
  font-weight: 750;
}

.pomo-dialogue-settings__heading p {
  margin: 0.25rem 0 0;
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.pomo-dialogue-settings__automatic {
  display: grid;
  gap: 0.875rem;
  border: 1px solid rgb(214 181 133 / 24%);
  border-radius: var(--pomo-radius-panel);
  background: rgb(214 181 133 / 4%);
  padding: var(--pomo-padding-lg);
}

.pomo-dialogue-settings__automatic h4,
.pomo-dialogue-settings__automatic p {
  margin: 0;
}

.pomo-dialogue-settings__automatic h4 {
  color: var(--pomo-text);
  font-size: 0.8125rem;
  font-weight: 750;
}

.pomo-dialogue-settings__automatic > div:first-child > p {
  margin-top: 0.2rem;
  color: var(--pomo-text-muted);
  font-size: 0.65rem;
  line-height: 1.5;
}

.pomo-dialogue-settings__automatic-controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.pomo-dialogue-settings__automatic-loading,
.pomo-dialogue-settings__automatic-message {
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.pomo-dialogue-settings__library-heading {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-top: 1px solid var(--pomo-border);
  padding-top: var(--pomo-padding-lg);
}

.pomo-dialogue-settings__library-heading > span {
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
}

.pomo-dialogue-settings__create,
.pomo-dialogue-settings__actions button,
.pomo-dialogue-settings__actions a {
  display: inline-flex;
  min-height: 2.25rem;
  box-sizing: border-box;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid var(--pomo-border);
  border-radius: var(--pomo-radius-control);
  background: transparent;
  padding: 0 var(--pomo-padding-md);
  color: var(--pomo-text-muted);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;
}

.pomo-dialogue-settings__create {
  flex: none;
  border-color: var(--pomo-brass);
  color: var(--pomo-text);
}

.pomo-dialogue-settings__create:hover,
.pomo-dialogue-settings__actions button:hover,
.pomo-dialogue-settings__actions a:hover {
  background: var(--pomo-secondary-soft);
  color: var(--pomo-text);
}

.pomo-dialogue-settings__create:focus-visible,
.pomo-dialogue-settings__actions button:focus-visible,
.pomo-dialogue-settings__actions a:focus-visible,
.pomo-dialogue-settings__dialogue-trigger:focus-visible {
  outline: 2px solid var(--pomo-brass);
  outline-offset: 2px;
}

.pomo-dialogue-settings__list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pomo-dialogue-settings__list > li {
  display: grid;
  gap: 0.75rem;
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: var(--pomo-radius-panel);
  background: rgb(255 255 255 / 3%);
  padding: var(--pomo-padding-lg);
}

.pomo-dialogue-settings__list > li[data-connected] {
  border-color: rgb(214 181 133 / 32%);
  background: rgb(214 181 133 / 5%);
}

.pomo-dialogue-settings__list > li[data-disabled] {
  background: rgb(255 255 255 / 1.5%);
}

.pomo-dialogue-settings__list--library > li {
  padding-block: var(--pomo-padding-md);
}

.pomo-dialogue-settings__event-heading {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
}

.pomo-dialogue-settings__event-symbol {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border-radius: 50%;
  background: var(--pomo-secondary-soft);
  color: var(--pomo-brass);
}

.pomo-dialogue-settings__event-heading > div:nth-child(2),
.pomo-dialogue-settings__event-heading > div:nth-child(2) > div {
  min-width: 0;
}

.pomo-dialogue-settings__event-heading > div:nth-child(2) > div {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.pomo-dialogue-settings__event-heading h5 {
  margin: 0;
  color: var(--pomo-text);
  font-size: 0.8125rem;
  font-weight: 750;
}

.pomo-dialogue-settings__event-heading > div:nth-child(2) > div > span {
  border-radius: 999px;
  background: rgb(255 255 255 / 5%);
  padding: var(--pomo-padding-xs) var(--pomo-padding-sm);
  color: var(--pomo-text-muted);
  font-size: 0.5625rem;
  font-weight: 700;
}

.pomo-dialogue-settings__event-heading p {
  margin: 0.2rem 0 0;
  color: var(--pomo-text-muted);
  font-size: 0.65rem;
  line-height: 1.4;
}

.pomo-dialogue-settings__connection {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
}

.pomo-dialogue-settings__connection > span {
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
}

.pomo-dialogue-settings__dialogue-trigger {
  display: inline-flex;
  width: 10rem;
  min-height: 2rem;
  box-sizing: border-box;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid var(--pomo-border);
  border-radius: var(--pomo-radius-control);
  background: transparent;
  padding-inline: var(--pomo-padding-md) var(--pomo-padding-sm);
  color: var(--pomo-text);
  font: inherit;
  font-size: 0.65rem;
  font-weight: 700;
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;
}

.pomo-dialogue-settings__dialogue-trigger-text {
  display: block;
  max-width: 20ch;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pomo-dialogue-settings__dialogue-trigger:hover:not(:disabled),
.pomo-dialogue-settings__dialogue-trigger[data-expanded] {
  border-color: rgb(214 181 133 / 38%);
  background: var(--pomo-secondary-soft);
}

.pomo-dialogue-settings__dialogue-trigger:disabled {
  cursor: not-allowed;
  color: var(--pomo-text-muted);
  opacity: 0.55;
}

.pomo-dialogue-settings__dialogue-icon {
  display: inline-flex;
  flex: none;
  color: var(--pomo-text-muted);
  transition: transform 140ms ease;
}

.pomo-dialogue-settings__dialogue-trigger[data-expanded]
  .pomo-dialogue-settings__dialogue-icon {
  transform: rotate(180deg);
}

.pomo-dialogue-settings__dialogue-menu {
  display: grid;
  width: min(21rem, calc(100vw - 2rem));
  max-height: min(18rem, var(--kb-popper-available-height));
  box-sizing: border-box;
  gap: 0.15rem;
  overflow-y: auto;
  border: 1px solid var(--pomo-border);
  border-radius: 0.875rem;
  background: var(--pomo-surface-strong);
  padding: var(--pomo-padding-sm);
  color: var(--pomo-text);
  box-shadow: var(--pomo-shadow);
  outline: none;
  transform-origin: var(--kb-menu-content-transform-origin);
  animation: pomo-dialogue-menu-in 140ms ease-out;
}

.pomo-dialogue-settings__dialogue-item {
  display: grid;
  min-height: 2.75rem;
  cursor: pointer;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.6rem;
  border-radius: 0.625rem;
  padding: var(--pomo-padding-sm) var(--pomo-padding-md);
  color: var(--pomo-text);
  font-size: 0.6875rem;
  outline: none;
}

.pomo-dialogue-settings__dialogue-item[data-highlighted] {
  background: var(--pomo-secondary-soft);
}

.pomo-dialogue-settings__dialogue-item--clear {
  color: var(--pomo-text-muted);
}

.pomo-dialogue-settings__dialogue-item--clear[data-disabled] {
  cursor: default;
  opacity: 0.45;
}

.pomo-dialogue-settings__dialogue-indicator {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--pomo-border);
  border-radius: 0.25rem;
  color: transparent;
}

.pomo-dialogue-settings__dialogue-indicator[data-checked] {
  border-color: var(--pomo-accent);
  background: var(--pomo-accent);
  color: var(--pomo-text);
}

.pomo-dialogue-settings__dialogue-item-text {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.pomo-dialogue-settings__dialogue-item-text strong,
.pomo-dialogue-settings__dialogue-item-text small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pomo-dialogue-settings__dialogue-item-text strong {
  display: block;
  max-width: 28ch;
  font-size: 0.7rem;
  font-weight: 700;
}

.pomo-dialogue-settings__dialogue-item-text small {
  color: var(--pomo-text-muted);
  font-size: 0.6rem;
}

.pomo-dialogue-settings__sequence {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  border-top: 1px solid var(--pomo-border);
  padding: var(--pomo-padding-md) 0 0;
  list-style: none;
}

.pomo-dialogue-settings__sequence > li {
  display: grid;
  min-width: 0;
  grid-template-columns: 1.25rem minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
}

.pomo-dialogue-settings__sequence > li > span {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border-radius: 50%;
  background: var(--pomo-secondary-soft);
  color: var(--pomo-brass);
  font-size: 0.625rem;
  font-weight: 750;
}

.pomo-dialogue-settings__sequence p {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pomo-dialogue-menu-in {
  from {
    opacity: 0;
    transform: scale(0.97) translateY(-0.2rem);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.pomo-dialogue-settings__selected-dialogue {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid var(--pomo-border);
  padding-top: var(--pomo-padding-md);
}

.pomo-dialogue-settings__selected-dialogue--library {
  align-items: flex-end;
  border-top: 0;
  padding-top: 0;
}

.pomo-dialogue-settings__summary {
  min-width: 0;
  flex: 1;
}

.pomo-dialogue-settings__summary p {
  display: block;
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: var(--pomo-text);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pomo-dialogue-settings__selected-dialogue--library .pomo-dialogue-settings__summary p {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  white-space: normal;
}

.pomo-dialogue-settings__summary > span {
  display: block;
  margin-top: 0.25rem;
  color: var(--pomo-text-muted);
  font-size: 0.625rem;
}

.pomo-dialogue-settings__actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pomo-dialogue-settings__actions .pomo-dialogue-settings__delete-confirm {
  border-color: rgb(239 135 120 / 50%);
  color: #f2a398;
}

.pomo-dialogue-settings__unconnected {
  margin: 0;
  border-top: 1px solid var(--pomo-border);
  padding-top: var(--pomo-padding-md);
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.pomo-dialogue-settings__loading,
.pomo-dialogue-settings__message,
.pomo-dialogue-settings__empty {
  margin: 0;
  border-radius: var(--pomo-radius-panel);
  background: rgb(255 255 255 / 3%);
  padding: var(--pomo-padding-xl);
  color: var(--pomo-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: center;
}

.pomo-dialogue-settings__empty {
  border: 1px dashed var(--pomo-border);
}

.pomo-dialogue-settings__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.pomo-dialogue-settings__loading > span {
  animation: pomo-dialogue-settings-spin 800ms linear infinite;
}

@keyframes pomo-dialogue-settings-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (width < 42rem) {
  .pomo-dialogue-settings__event-heading {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .pomo-dialogue-settings__connection {
    grid-column: 1 / -1;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .pomo-dialogue-settings__dialogue-trigger {
    width: 100%;
  }
}

@media (width < 32rem) {
  .pomo-dialogue-settings__automatic-controls {
    grid-template-columns: 1fr;
  }

  .pomo-dialogue-settings__selected-dialogue {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-dialogue-settings__create,
  .pomo-dialogue-settings__actions button,
  .pomo-dialogue-settings__actions a,
  .pomo-dialogue-settings__dialogue-trigger,
  .pomo-dialogue-settings__dialogue-icon {
    transition: none;
  }

  .pomo-dialogue-settings__dialogue-menu,
  .pomo-dialogue-settings__loading > span {
    animation: none;
  }
}
`
