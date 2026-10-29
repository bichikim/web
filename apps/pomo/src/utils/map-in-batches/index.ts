import {chunk} from 'es-toolkit/array'

export interface MapInBatchesOptions<Item, Value> {
  /** 한 묶음에서 함께 시작할 항목 수. 양의 정수여야 한다. */
  readonly batchSize: number
  /** 묶음의 각 항목을 한 번씩 입력 순서대로 호출해 결과를 모은다. 동기 예외도 Promise 거부처럼 처리한다. */
  readonly map: (item: Item) => Promise<Value>
}

/** 묶음 전체의 완료를 기다린 뒤 다음 묶음을 시작하고, 결과를 입력 순서로 반환한다. */
export const mapInBatches = async <Item, Value>(
  items: ReadonlyArray<Item>,
  options: MapInBatchesOptions<Item, Value>,
): Promise<Array<Awaited<Value>>> => {
  const {map} = options
  const results: Array<Awaited<Value>> = []
  for (const batch of chunk(items, options.batchSize)) {
    // oxlint-disable-next-line no-await-in-loop -- Keep the barrier between complete batches.
    const batchResults = await Promise.all(
      batch.map((item) => {
        try {
          return map(item)
        } catch (error: unknown) {
          return Promise.reject(error)
        }
      }),
    )
    results.push(...batchResults)
  }
  return results
}
