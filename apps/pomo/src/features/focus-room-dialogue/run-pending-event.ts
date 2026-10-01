export interface PendingEventOptions {
  readonly onEvent: () => Promise<void> | void
  readonly onError: (error: unknown) => void
  readonly onSettled: () => void
}
/** Runs an event in the next promise turn and settles after success or handled failure. */
export const runPendingEvent = (options: PendingEventOptions): void => {
  Promise.resolve()
    .then(() => options.onEvent())
    .catch(options.onError)
    .finally(options.onSettled)
}
