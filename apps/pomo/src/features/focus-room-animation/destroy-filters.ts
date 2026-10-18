import type {Filter} from 'pixi.js'

/** 모든 필터의 정리를 시도한 뒤 첫 번째 실패를 다시 던집니다. */
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
