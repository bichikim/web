import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'

/** Runs tasks in input order, continuing after failures and preserving settled result order. */
export const settleSequentially = <Item, Value>(
  items: ReadonlyArray<Item>,
  task: (item: Item) => Promise<Value>,
): Promise<PromiseSettledResult<Value>[]> => {
  const queue = createSerialTaskQueue()
  return Promise.allSettled(items.map((item) => queue.run(() => task(item))))
}
