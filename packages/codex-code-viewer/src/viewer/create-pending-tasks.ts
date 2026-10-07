export const createPendingTasks = () => {
  const pending = new Set<Promise<unknown>>()
  const run = <Value>(operation: () => Promise<Value>): Promise<Value> => {
    const task = Promise.resolve().then(operation)
    pending.add(task)
    const release = (): void => {
      pending.delete(task)
    }
    task.then(release, release)
    return task
  }
  const settle = (): Promise<void> =>
    pending.size === 0 ? Promise.resolve() : Promise.allSettled(pending).then(settle)
  return {run, settle}
}
