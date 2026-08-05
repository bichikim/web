import {type CachedFunction, createAsync, revalidate} from '@solidjs/router'
import {type Accessor, createMemo, createSignal, untrack} from 'solid-js'
import {resolveAccessor} from '@winter-love/solid-use'
import {toArray} from '@winter-love/utils'

export interface HandyQueryResult<TData> {
  data: () => TData | undefined
  loading: Accessor<boolean>
  refetch: () => Promise<TData | undefined>
}

export interface HandyQueryOptions<TData> {
  deferStream?: boolean
  initialValue?: TData
  name?: string
}

/**
 *
 * @example
 * const useUserQuery = withHandyQuery(userQuery)
 */
export const withHandyQuery = <T extends (...args: any) => any>(query: CachedFunction<T>) => {
  type TArgs = Parameters<typeof query>
  type TData = Awaited<ReturnType<typeof query>>

  // oxlint-disable-next-line unicorn/consistent-function-scoping
  const isArgsOrAccessor = (value: unknown): value is Accessor<TArgs | undefined> | TArgs => {
    return typeof value === 'function' || Array.isArray(value)
  }

  const getParams = (
    argsOrOptions?: HandyQueryOptions<TData> | Accessor<TArgs | undefined> | TArgs,
    options?: HandyQueryOptions<TData>,
  ) => {
    if (isArgsOrAccessor(argsOrOptions)) {
      return {
        args: argsOrOptions,
        options,
      }
    }

    return {
      args: undefined,
      options,
    }
  }

  /**
   * @example
   * const {data, loading, refetch} = useHandyQuery({deferStream: true, initialValue: null})
   * const {data, loading, refetch} = useHandyQuery(args)
   * const {data, loading, refetch} = useHandyQuery(args, {deferStream: true, initialValue: null})
   * const {data, loading, refetch} = useHandyQuery(args, {deferStream: true, initialValue: null})
   */
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
    const [pending, setPending] = createSignal(false)
    let pendingCount = 0

    const {args, options: _options} = getParams(argsOrOptions, options)

    const argsAccessor = resolveAccessor(args)

    // todo createAsync 와 createResource 가 cleanup 이 되는지 확인해 보자
    const data = createAsync(
      async () => {
        const args = toArray(argsAccessor())

        pendingCount += 1
        setPending(true)

        try {
          return await query(...args)
        } finally {
          pendingCount -= 1
          setPending(pendingCount > 0)
        }
      },
      {
        deferStream: _options?.deferStream,
        initialValue: _options?.initialValue,
        name: _options?.name as any,
      },
    )

    const refetch = async () => {
      await revalidate(query.key, false)

      return untrack(() => data())
    }

    const loading = createMemo(() => pending())

    return {data, loading, refetch}
  }

  return useHandyQuery
}
