export interface GpuQueue {
  <T>(operation: () => T | Promise<T>): Promise<T>
}
/** Serializes calls that borrow the same native GPU renderer, recovering after failed operations. */
export const createGpuQueue = (): GpuQueue => {
  let pending = Promise.resolve()
  return (operation) => {
    const task = pending.then(operation)
    pending = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }
}
