import type {Filter} from 'pixi.js'

/** Attempts every filter destruction and rethrows the first failure. */
export const destroyFilters = (filters: readonly Filter[]): void => {
  const errors: unknown[] = []
  for (const filter of filters) {
    try {
      filter.destroy()
    } catch (error: unknown) {
      errors.push(error)
    }
  }

  if (errors.length > 0) {
    throw errors[0]
  }
}
