import {type CachedFunction, revalidate, createAsync, type AccessorWithLatest} from '@solidjs/router'
import {createMemo, type Accessor} from 'solid-js'

type AsyncReturnType<T extends (...args: any) => any> = Awaited<ReturnType<T>>

export interface HandyQueryResult<T extends (...args: any) => any, EmptyValue = undefined> {
  data: Accessor<AsyncReturnType<T> | EmptyValue>
  refetch: () => Promise<T | EmptyValue>
}

export interface HandyQueryOptions<EmptyValue = undefined> {
  emptyValue: EmptyValue
}

export const withHandyQuery = <T extends (...args: any) => any>(
  query: CachedFunction<T>,
): (<EmptyValue>(options: HandyQueryOptions<EmptyValue>) => HandyQueryResult<T, EmptyValue>) => {
  return <EmptyValue>(options?: HandyQueryOptions<EmptyValue>): any => {
    const _data = createAsync<T>(() => query())

    const data = createMemo<T | EmptyValue | undefined>(() => _data() ?? options?.emptyValue)

    const refetch = async () => {
      await revalidate(query.key)

      return data()
    }

    return {data, refetch}
  }
}
