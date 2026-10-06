/** Awaits each callback in iterable order, stopping and closing the iterator on the first callback failure. */
export const forEachSequential = async <T>(
  values: Iterable<T>,
  callback: (value: T) => Promise<void>,
): Promise<void> => {
  for (const value of values) {
    // Start the next callback only after this one succeeds.
    // oxlint-disable-next-line no-await-in-loop
    await callback(value)
  }
}
