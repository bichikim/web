export const POMO_FEED_STATUS_STYLES = String.raw`
.pomo-feed-status {
  display: flex;
  width: min(36rem, 100%);
  box-sizing: border-box;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 1rem;
  padding: 0.8rem 0.9rem;
  color: var(--pomo-text);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%);
  pointer-events: auto;
  backdrop-filter: blur(0.75rem);
  -webkit-backdrop-filter: blur(0.75rem);
}

.pomo-feed-status > [class*='i-tabler'] {
  flex: none;
  color: var(--pomo-brass);
}

.pomo-feed-status__spinner {
  width: 1rem;
  height: 1rem;
  box-sizing: border-box;
  flex: none;
  animation: pomo-feed-spin 1s linear infinite;
  border: 2px solid rgb(255 255 255 / 24%);
  border-top-color: var(--pomo-brass);
  border-radius: 50%;
}

.pomo-feed-status__copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.15rem;
}

.pomo-feed-status__copy strong,
.pomo-feed-status__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pomo-feed-status__copy strong {
  font-size: 0.78rem;
}

.pomo-feed-status__copy small {
  color: var(--pomo-text-muted);
  font-size: 0.68rem;
}

.pomo-feed-status__action {
  flex: none;
  white-space: nowrap;
}

.pomo-feed-status__actions {
  display: flex;
  flex: none;
  gap: 0.35rem;
}

@keyframes pomo-feed-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (width < 34rem) {
  .pomo-feed-status[data-state='recovery'] {
    flex-wrap: wrap;
  }

  .pomo-feed-status[data-state='recovery'] .pomo-feed-status__actions {
    width: 100%;
  }

  .pomo-feed-status[data-state='recovery'] .pomo-feed-status__action {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pomo-feed-status__spinner {
    animation: none;
  }
}
`
