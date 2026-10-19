/** Defers preparation until the foreground owner releases its first-discovery milestone. */
export const createPreparationGate = () => {
  let current: ReturnType<typeof Promise.withResolvers<void>> | undefined
  return {
    begin: (): (() => void) => {
      current?.resolve()
      const entry = Promise.withResolvers<void>()
      current = entry
      return () => {
        entry.resolve()
        if (current === entry) {
          current = undefined
        }
      }
    },
    release: (): void => {
      current?.resolve()
      current = undefined
    },
    wait: async (): Promise<void> => {
      // oxlint-disable-next-line no-unmodified-loop-condition -- Foreground completion replaces or releases the event.
      while (current !== undefined) {
        // oxlint-disable-next-line no-await-in-loop -- Follow a replacement foreground owner without polling.
        await current.promise
      }
    },
  }
}
