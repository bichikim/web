export const POMO_DIALOGUE_EDITOR_STYLES = String.raw`
.pomo-dialogue-editor {
  min-height: 100dvh;
  box-sizing: border-box;
  background: radial-gradient(circle at 15% 0%, rgb(122 83 53 / 20%), transparent 32rem), #17130f;
  padding: max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right))
    max(6rem, calc(1.25rem + env(safe-area-inset-bottom))) max(1.25rem, env(safe-area-inset-left));
  color: #fffaf1;
}

.pomo-dialogue-editor__header,
.pomo-dialogue-editor__layout,
.pomo-dialogue-editor__footer {
  width: min(100%, 68rem);
  margin-inline: auto;
}

.pomo-dialogue-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  padding-block: 1rem 2rem;
}

.pomo-dialogue-editor__eyebrow {
  margin: 0 0 0.5rem;
  color: #d6b585;
  font-size: 0.75rem;
  font-weight: 750;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.pomo-dialogue-editor__header h1 {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.2;
}

.pomo-dialogue-editor__header p:not(.pomo-dialogue-editor__eyebrow) {
  max-width: 42rem;
  margin: 0.75rem 0 0;
  color: #c8baaa;
  line-height: 1.6;
}

.pomo-dialogue-editor__back {
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex: none;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
  padding: 0 1rem;
  color: #fffaf1;
  text-decoration: none;
}

.pomo-dialogue-editor__layout {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.pomo-dialogue-editor__panel {
  display: grid;
  align-content: start;
  gap: 1.25rem;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 1.25rem;
  background: rgb(38 31 25 / 88%);
  padding: clamp(1.1rem, 3vw, 1.5rem);
  box-shadow: 0 1.5rem 5rem rgb(0 0 0 / 20%);
}

.pomo-dialogue-editor__timeline-panel {
  grid-column: 1 / -1;
}

.pomo-dialogue-editor__section-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.pomo-dialogue-editor__section-heading > span {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: #d6b585;
  color: #241a12;
  font-size: 0.8rem;
  font-weight: 800;
}

.pomo-dialogue-editor__section-heading h2 {
  margin: 0;
  font-size: 1.05rem;
}

.pomo-dialogue-editor__section-heading p {
  margin: 0.3rem 0 0;
  color: #ad9f90;
  font-size: 0.8rem;
  line-height: 1.5;
}

.pomo-dialogue-editor__field {
  display: grid;
  gap: 0.5rem;
  color: #eee4d9;
  font-size: 0.82rem;
  font-weight: 700;
}

.pomo-dialogue-editor__field-label {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.pomo-dialogue-editor__field small {
  color: #8e8276;
  font-weight: 550;
}

.pomo-dialogue-editor__field select,
.pomo-dialogue-editor__field textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 0.75rem;
  background: #17130f;
  color: #fffaf1;
  font: inherit;
  font-weight: 500;
  outline: none;
}

.pomo-dialogue-editor__field select {
  min-height: 3rem;
  padding: 0 0.9rem;
}

.pomo-dialogue-editor__field textarea {
  min-height: 12rem;
  resize: vertical;
  padding: 0.9rem;
  line-height: 1.6;
}

.pomo-dialogue-editor__field select:focus-visible,
.pomo-dialogue-editor__field textarea:focus-visible,
.pomo-dialogue-editor__back:focus-visible,
.pomo-dialogue-editor__button:focus-visible {
  outline: 2px solid #d6b585;
  outline-offset: 2px;
}

.pomo-dialogue-editor__selects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.pomo-dialogue-editor__status {
  display: flex;
  min-height: 3rem;
  box-sizing: border-box;
  align-items: center;
  gap: 0.65rem;
  border-radius: 0.75rem;
  background: rgb(214 181 133 / 9%);
  padding: 0.75rem;
  color: #d8caba;
  font-size: 0.8rem;
  line-height: 1.4;
}

.pomo-dialogue-editor__status strong {
  margin-left: auto;
  color: #e6c998;
}

.pomo-dialogue-editor__voice-actions,
.pomo-dialogue-editor__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.pomo-dialogue-editor__button {
  min-height: 2.75rem;
  cursor: pointer;
  border: 0;
  border-radius: 999px;
  padding: 0 1.2rem;
  font-weight: 750;
}

.pomo-dialogue-editor__button--primary {
  background: #d6b585;
  color: #241a12;
}

.pomo-dialogue-editor__button--secondary {
  border: 1px solid rgb(255 255 255 / 14%);
  background: transparent;
  color: #fffaf1;
}

.pomo-dialogue-editor__button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.pomo-dialogue-editor__preview {
  display: grid;
  gap: 0.75rem;
}

.pomo-dialogue-editor__preview > div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.8rem;
}

.pomo-dialogue-editor__preview span {
  color: #9f9387;
}

.pomo-dialogue-editor__preview audio {
  width: 100%;
}

.pomo-dialogue-editor__segments {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pomo-dialogue-editor__segments li {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr) 10rem;
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 4%);
  padding: 0.75rem;
}

.pomo-dialogue-editor__segments span {
  color: #d6b585;
  font-size: 0.75rem;
  font-weight: 750;
}

.pomo-dialogue-editor__segments p,
.pomo-dialogue-editor__empty {
  margin: 0;
  color: #ddd2c6;
  font-size: 0.85rem;
  line-height: 1.6;
}

.pomo-dialogue-editor__mood {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  color: #ddd2c6;
}

.pomo-dialogue-editor__mood img {
  width: 2.75rem;
  height: 2.75rem;
  object-fit: contain;
}

.pomo-dialogue-editor__mood span {
  color: #d8caba;
  line-height: 1.35;
}

.pomo-dialogue-editor__empty {
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 3%);
  padding: 1.5rem;
  text-align: center;
}

.pomo-dialogue-editor__footer {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: max(1rem, env(safe-area-inset-left));
  width: auto;
  align-items: center;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 1rem;
  background: rgb(29 23 18 / 94%);
  padding: 0.75rem;
  box-shadow: 0 1rem 4rem rgb(0 0 0 / 35%);
}

.pomo-dialogue-editor__footer p {
  margin: 0 auto 0 0;
  color: #a99d90;
  font-size: 0.75rem;
}

@media (width < 48rem) {
  .pomo-dialogue-editor__header {
    display: grid;
    gap: 1rem;
  }

  .pomo-dialogue-editor__back {
    justify-self: start;
  }

  .pomo-dialogue-editor__layout {
    grid-template-columns: 1fr;
  }

  .pomo-dialogue-editor__timeline-panel {
    grid-column: auto;
  }

  .pomo-dialogue-editor__segments li {
    grid-template-columns: 3.5rem minmax(0, 1fr);
  }

  .pomo-dialogue-editor__mood {
    grid-column: 2;
  }

  .pomo-dialogue-editor__footer p {
    display: none;
  }
}

@media (width < 28rem) {
  .pomo-dialogue-editor__selects {
    grid-template-columns: 1fr;
  }
}
`
