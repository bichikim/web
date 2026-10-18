import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'

/** 작업을 입력 순서대로 실행하고 실패 후에도 계속하며, 완료 결과의 순서를 유지한다. */
export const settleSequentially = <Item, Value>(
  items: ReadonlyArray<Item>,
  task: (item: Item) => Promise<Value>,
): Promise<PromiseSettledResult<Value>[]> => {
  const queue = createSerialTaskQueue()
  return Promise.allSettled(items.map((item) => queue.run(() => task(item))))
}
