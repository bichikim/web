import {memoize} from 'es-toolkit/function'

export interface MemoizeAsyncOptions<Argument> {
  /** 인자를 캐시 키로 변환한다. 생략하면 인자 자체를 키로 사용하며, 객체는 참조로 구분한다. 인자가 없으면 undefined를 전달한다. */
  readonly getCacheKey?: (argument: Argument) => unknown
}

export interface MemoizedAsync<Arguments extends ReadonlyArray<unknown>, Value> {
  (...values: Arguments): Promise<Value>
}

interface MemoizeAsyncRequest<Arguments extends ReadonlyArray<unknown>> {
  readonly key: unknown
  readonly values: Arguments
}

/**
 * 같은 키의 실행 중인 Promise와 성공 결과를 공유한다. 인자가 없거나 하나인 함수를 지원한다.
 * 작업이 실패하면 해당 키를 제거해 다음 호출에서 재시도하며, 작업의 동기 예외도 Promise 거부로 전달한다.
 */
export const memoizeAsync = <Arguments extends [argument?: unknown], Value>(
  operation: (...values: Arguments) => Promise<Value>,
  options: MemoizeAsyncOptions<Arguments[0]> = {},
): MemoizedAsync<Arguments, Value> => {
  const cache = new Map<unknown, Promise<Value>>()
  const getCacheKey = options.getCacheKey ?? ((argument: Arguments[0]) => argument)
  const execute = async (values: Arguments): Promise<Value> => operation(...values)
  const cached = memoize(
    (request: MemoizeAsyncRequest<Arguments>): Promise<Value> =>
      execute(request.values).catch((error: unknown) => {
        cache.delete(request.key)
        throw error
      }),
    {cache, getCacheKey: (request) => request.key},
  )

  return (...values) => {
    const key = getCacheKey(values[0])
    return cached({key, values})
  }
}
