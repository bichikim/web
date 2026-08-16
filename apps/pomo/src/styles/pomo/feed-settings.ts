export const POMO_FEED_SETTINGS_STYLES = String.raw`
.pomo-feed-settings {
  display: grid;
  gap: 1.125rem;
}

.pomo-feed-settings__heading h3,
.pomo-feed-settings__list-heading h4,
.pomo-feed-settings__recommendation-heading h4 {
  margin: 0;
  color: var(--pomo-text);
  font-size: 0.9375rem;
  font-weight: 750;
}

.pomo-feed-settings__heading p {
  margin: 0.25rem 0 0;
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.pomo-feed-settings__form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.75rem;
}

.pomo-feed-settings__url-field {
  display: grid;
  min-width: 0;
  gap: 0.375rem;
}

.pomo-feed-settings__url-field > span {
  color: var(--pomo-text-muted);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1rem;
}

.pomo-feed-settings__url-field input {
  width: 100%;
  height: var(--pomo-control-height-medium);
  box-sizing: border-box;
  border: 1px solid var(--pomo-border);
  border-radius: var(--pomo-radius-control);
  background: var(--pomo-surface);
  padding: 0 var(--pomo-padding-lg);
  color: var(--pomo-text);
  font: inherit;
  font-size: 0.8125rem;
  outline: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;
}

.pomo-feed-settings__url-field input::placeholder {
  color: var(--pomo-text-muted);
  opacity: 0.7;
}

.pomo-feed-settings__url-field input:hover {
  border-color: var(--pomo-border-hover);
}

.pomo-feed-settings__url-field input:focus-visible {
  border-color: var(--pomo-brass);
  outline: 2px solid var(--pomo-brass);
  outline-offset: 2px;
}

.pomo-feed-settings__add,
.pomo-feed-settings__delete {
  display: inline-flex;
  height: var(--pomo-control-height-medium);
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
  transition:
    border-color 140ms ease,
    background-color 140ms ease,
    color 140ms ease;
}

.pomo-feed-settings__add {
  border-color: var(--pomo-brass);
  color: var(--pomo-text);
}

.pomo-feed-settings__delete {
  height: 2.5rem;
}

.pomo-feed-settings__add:hover:not(:disabled),
.pomo-feed-settings__delete:hover {
  background: var(--pomo-secondary-soft);
  color: var(--pomo-text);
}

.pomo-feed-settings__add:focus-visible,
.pomo-feed-settings__delete:focus-visible {
  outline: 2px solid var(--pomo-brass);
  outline-offset: 2px;
}

.pomo-feed-settings__add:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.pomo-feed-settings__list-heading {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-top: 1px solid var(--pomo-border);
  padding-top: var(--pomo-padding-lg);
}

.pomo-feed-settings__refresh {
  display: inline-flex;
  min-height: 2rem;
  cursor: pointer;
  align-items: center;
  gap: 0.3rem;
  margin-left: auto;
  border: 1px solid var(--pomo-border);
  border-radius: var(--pomo-radius-control);
  background: transparent;
  padding: 0 var(--pomo-padding-md);
  color: var(--pomo-text-muted);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
}

.pomo-feed-settings__refresh:hover {
  border-color: var(--pomo-brass);
  color: var(--pomo-text);
}

.pomo-feed-settings__refresh:focus-visible {
  outline: 2px solid var(--pomo-brass);
  outline-offset: 2px;
}

.pomo-feed-settings__load-more {
  min-height: 2.25rem;
  cursor: pointer;
  justify-self: center;
  border: 1px solid var(--pomo-border);
  border-radius: var(--pomo-radius-control);
  background: transparent;
  padding: 0 var(--pomo-padding-lg);
  color: var(--pomo-text-muted);
  font: inherit;
  font-size: 0.6875rem;
  font-weight: 700;
}

.pomo-feed-settings__load-more:hover {
  border-color: var(--pomo-brass);
  color: var(--pomo-text);
}

.pomo-feed-settings__load-more:focus-visible {
  outline: 2px solid var(--pomo-brass);
  outline-offset: 2px;
}

.pomo-feed-settings__list-heading > span,
.pomo-feed-settings__recommendation-heading > span {
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
}

.pomo-feed-settings__list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pomo-feed-settings__list > li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(8.5rem, auto) auto;
  align-items: end;
  gap: 0.75rem;
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: var(--pomo-radius-panel);
  background: rgb(255 255 255 / 3%);
  padding: var(--pomo-padding-md) var(--pomo-padding-lg);
}

.pomo-feed-settings__list > li[data-recommended] {
  border-style: dashed;
  border-color: rgb(214 181 133 / 28%);
  background: rgb(214 181 133 / 4%);
}

.pomo-feed-settings__recommendation-heading {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.pomo-feed-settings__address {
  display: flex;
  min-width: 0;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.6rem;
  color: var(--pomo-brass);
}

.pomo-feed-settings__address-copy {
  display: grid;
  min-width: 0;
  gap: 0.15rem;
}

.pomo-feed-settings__address-copy strong,
.pomo-feed-settings__address-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
}

.pomo-feed-settings__address-copy strong {
  color: var(--pomo-text);
  font-size: 0.75rem;
  font-weight: 650;
  white-space: nowrap;
}

.pomo-feed-settings__address-copy small {
  color: var(--pomo-text-muted);
  font-size: 0.625rem;
  line-height: 1.4;
}

.pomo-feed-settings__status,
.pomo-feed-settings__message,
.pomo-feed-settings__empty {
  margin: 0;
  border-radius: var(--pomo-radius-panel);
  background: rgb(255 255 255 / 3%);
  padding: var(--pomo-padding-xl);
  color: var(--pomo-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: center;
}

.pomo-feed-settings__dialogue-list,
.pomo-feed-settings__issue-list {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pomo-feed-settings__dialogue-list > li,
.pomo-feed-settings__issue-list > li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgb(255 255 255 / 6%);
  border-radius: var(--pomo-radius-panel);
  background: rgb(255 255 255 / 3%);
  padding: var(--pomo-padding-md) var(--pomo-padding-lg);
}

.pomo-feed-settings__dialogue-copy,
.pomo-feed-settings__issue-list > li > span {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.2rem;
}

.pomo-feed-settings__dialogue-copy strong,
.pomo-feed-settings__issue-list strong {
  overflow: hidden;
  color: var(--pomo-text);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pomo-feed-settings__dialogue-copy small,
.pomo-feed-settings__issue-list small {
  color: var(--pomo-text-muted);
  font-size: 0.625rem;
  line-height: 1.45;
}

.pomo-feed-settings__listened-state {
  color: var(--pomo-brass);
  font-weight: 700;
}

.pomo-feed-settings__listened-state[data-listened] {
  color: var(--pomo-text-muted);
}

.pomo-feed-settings__dialogue-actions {
  display: flex;
  flex: none;
  gap: 0.4rem;
}

.pomo-feed-settings__dialogue-actions a,
.pomo-feed-settings__dialogue-actions button,
.pomo-feed-settings__issue-list a {
  display: inline-flex;
  min-height: 2rem;
  box-sizing: border-box;
  cursor: pointer;
  align-items: center;
  border: 1px solid var(--pomo-border);
  border-radius: var(--pomo-radius-control);
  background: transparent;
  padding: 0 var(--pomo-padding-md);
  color: var(--pomo-text);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  text-decoration: none;
}

.pomo-feed-settings__dialogue-actions a:hover,
.pomo-feed-settings__dialogue-actions button:hover,
.pomo-feed-settings__issue-list a:hover {
  border-color: var(--pomo-brass);
}

.pomo-feed-settings__dialogue-actions .pomo-feed-settings__delete-confirm {
  border-color: rgb(232 174 114 / 58%);
  color: #ffd9bd;
}

.pomo-feed-settings__dialogue-actions .pomo-feed-settings__delete-confirm:hover {
  border-color: #ffd9bd;
  background: rgb(232 174 114 / 12%);
}

.pomo-feed-settings__issue-heading {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.pomo-feed-settings__issue-heading h4 {
  margin: 0;
  color: var(--pomo-text);
  font-size: 0.8rem;
}

.pomo-feed-settings__issue-heading span {
  color: var(--pomo-text-muted);
  font-size: 0.6875rem;
}

.pomo-feed-settings__issue-list > li {
  border-color: rgb(232 174 114 / 22%);
}

.pomo-feed-settings__empty {
  border: 1px dashed var(--pomo-border);
}

@media (width < 42rem) {
  .pomo-feed-settings__form,
  .pomo-feed-settings__list > li {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .pomo-feed-settings__url-field,
  .pomo-feed-settings__address {
    grid-column: 1 / -1;
  }
}

@media (width < 28rem) {
  .pomo-feed-settings__form,
  .pomo-feed-settings__list > li {
    grid-template-columns: minmax(0, 1fr);
  }

  .pomo-feed-settings__add,
  .pomo-feed-settings__delete {
    width: 100%;
  }

  .pomo-feed-settings__dialogue-list > li,
  .pomo-feed-settings__issue-list > li {
    align-items: stretch;
    flex-direction: column;
  }

  .pomo-feed-settings__dialogue-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .pomo-feed-settings__dialogue-actions a,
  .pomo-feed-settings__dialogue-actions button {
    width: auto;
    flex: 1 1 5rem;
    justify-content: center;
  }

  .pomo-feed-settings__issue-list a {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-feed-settings__url-field input,
  .pomo-feed-settings__add,
  .pomo-feed-settings__delete {
    transition: none;
  }
}
`
