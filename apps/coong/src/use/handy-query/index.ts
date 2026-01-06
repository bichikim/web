import {type CachedFunction, revalidate, createAsync} from '@solidjs/router'
import {createMemo, type Accessor, untrack, createSignal} from 'solid-js'
import {resolveAccessor} from '@winter-love/solid-use'
import {toArray} from '@winter-love/utils'

export interface HandyQueryResult<TData> {
  data: () => TData | undefined
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

    const {args, options: _options} = getParams(argsOrOptions, options)

    const argsAccessor = resolveAccessor(args)

    const data = createAsync(
      async () => {
        const args = toArray(argsAccessor())

        setPending(true)

        const result = await query(...args)

        setPending(false)

        return result
      },
      {
        initialValue: _options?.initialValue,
        name: options?.name as any,
      },
    )

    const refetch = async () => {
      await revalidate(query.key, false)

      return untrack(() => data())
    }

    const loading = createMemo(() => pending())

    console.log('data', Boolean(data()), loading())

    return {data, loading, refetch}
  }

  return useHandyQuery
}
