import {type CachedFunction, revalidate} from '@solidjs/router'
import {createMemo, createResource, type Accessor, type Resource} from 'solid-js'
import {resolveAccessor} from '@winter-love/solid-use'

export interface HandyQueryResult<TData> {
  data: Resource<TData | undefined>
  loading: Accessor<boolean>
  refetch: () => Promise<TData | undefined>
}

export interface HandyQueryOptions<TData> {
  initialValue?: TData
  name?: string
}

export const withHandyQuery = <T extends (...args: any) => any>(query: CachedFunction<T>) => {
  type TArgs = Parameters<typeof query>
  type TData = Awaited<ReturnType<typeof query>>

  const isArgsOrAccessor = (value: unknown): value is Accessor<TArgs | undefined> | TArgs => {
    return typeof value === 'function' || Array.isArray(value)
  }

  function useHandyQuery(): HandyQueryResult<TData>
  function useHandyQuery(options: HandyQueryOptions<TData>): HandyQueryResult<TData>
  function useHandyQuery(
    args: Accessor<TArgs | undefined> | TArgs,
    options?: HandyQueryOptions<TData>,
  ): HandyQueryResult<TData>

  function useHandyQuery(
    argsOrOptions?: HandyQueryOptions<TData> | Accessor<TArgs | undefined> | TArgs,
    options?: HandyQueryOptions<TData>,
  ): HandyQueryResult<TData> {
    // no args case
    if (!isArgsOrAccessor(argsOrOptions)) {
      const [data, action] = createResource(() => query(), {
        initialValue: argsOrOptions?.initialValue,
        name: options?.name as any,
      })

      const refetch = async () => {
        await revalidate(query.key, false)

        return await action.refetch()
      }

      const loading = createMemo(() => data.loading)

      return {data, loading, refetch}
    }

    // args case
    const argsAccessor = resolveAccessor(argsOrOptions)

    const [data, action] = createResource(
      () => argsAccessor() ?? false,
      (args) => query(...args),
      {
        initialValue: options?.initialValue,
        name: options?.name as any,
      },
    )

    const refetch = async () => {
      const args = argsAccessor()

      if (!args) {
        return undefined
      }

      await revalidate(query.keyFor(...args), false)

      return await action.refetch()
    }

    const loading = createMemo(() => data.loading)

    return {data, loading, refetch}
  }

  return useHandyQuery
}
