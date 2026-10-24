/** @vitest-environment node */
import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {memoizeAsync} from '..'

interface ModelRequest {
  readonly id: string
}

interface Model {
  readonly id: string
}

describe('memoizeAsync', () => {
  it('should wait until first use and share the pending and fulfilled promise without arguments', async () => {
    const deferred = Promise.withResolvers<Model>()
    const load = vi.fn(() => deferred.promise)
    const getModel = memoizeAsync(load)
    expect(load).not.toHaveBeenCalled()
    const first = getModel()
    expect(load).toHaveBeenCalledExactlyOnceWith()
    expect(getModel()).toBe(first)
    const model = {id: 'A'}
    deferred.resolve(model)
    expect(await first).toBe(model)
    expect(getModel()).toBe(first)
    expect(await getModel()).toBe(model)
    expect(load).toHaveBeenCalledOnce()
    expectTypeOf(getModel).parameters.toEqualTypeOf<[]>()
    expectTypeOf(getModel()).toEqualTypeOf<Promise<Model>>()
  })

  it('should cache separate argument values independently while sharing repeated keys', async () => {
    const first = Promise.withResolvers<string>()
    const second = Promise.withResolvers<string>()
    const load = vi.fn((id: string) => (id === 'A' ? first.promise : second.promise))
    const getModel = memoizeAsync(load)
    const modelA = getModel('A')
    const modelB = getModel('B')
    expect(getModel('A')).toBe(modelA)
    expect(getModel('B')).toBe(modelB)
    expect(modelA).not.toBe(modelB)
    expect(load).toHaveBeenCalledTimes(2)
    second.resolve('B')
    expect(await modelB).toBe('B')
    first.resolve('A')
    expect(await modelA).toBe('A')
    expect(getModel('A')).toBe(modelA)
    expect(getModel('B')).toBe(modelB)
    expectTypeOf(getModel).parameters.toEqualTypeOf<[id: string]>()
  })

  it('should compare objects by reference unless a key resolver is supplied', async () => {
    const first = {id: 'A'}
    const second = {id: 'A'}
    const load = vi.fn(async (request: ModelRequest) => request.id)
    const getModel = memoizeAsync(load)
    const modelA = getModel(first)
    expect(getModel(first)).toBe(modelA)
    const otherModelA = getModel(second)
    expect(otherModelA).not.toBe(modelA)
    expect(await otherModelA).toBe('A')
    expect(await modelA).toBe('A')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('should resolve one key per call and share object arguments by that key', async () => {
    const load = vi.fn(async (request: ModelRequest) => request.id)
    const getCacheKey = vi.fn((request: ModelRequest) => request.id)
    const getModel = memoizeAsync(load, {getCacheKey})
    const first = getModel({id: 'A'})
    expect(getCacheKey).toHaveBeenCalledTimes(1)
    expect(getModel({id: 'A'})).toBe(first)
    expect(getCacheKey).toHaveBeenCalledTimes(2)
    expect(await first).toBe('A')
    expect(load).toHaveBeenCalledOnce()
  })

  it('should respect an undefined custom key instead of falling back to the argument', async () => {
    const load = vi.fn(async (id: string) => id)
    const getModel = memoizeAsync(load, {getCacheKey: () => undefined})
    const first = getModel('A')
    expect(getModel('B')).toBe(first)
    expect(await first).toBe('A')
    expect(load).toHaveBeenCalledOnce()
  })

  it('should reject all callers of a failed initialization and retry on the next call', async () => {
    const deferred = Promise.withResolvers<string>()
    const error = new Error('failed')
    const load = vi
      .fn<() => Promise<string>>()
      .mockReturnValueOnce(deferred.promise)
      .mockResolvedValue('retry')
    const getModel = memoizeAsync(load)
    const first = getModel()
    const second = getModel()
    expect(second).toBe(first)
    const rejected = expect(first).rejects.toBe(error)
    deferred.reject(error)
    await rejected
    const retry = getModel()
    expect(retry).not.toBe(first)
    expect(getModel()).toBe(retry)
    expect(await retry).toBe('retry')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('should remove only the failed key and retain other pending and fulfilled keys', async () => {
    const failed = Promise.withResolvers<string>()
    const retained = Promise.withResolvers<string>()
    const load = vi
      .fn<(id: string) => Promise<string>>()
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(retained.promise)
      .mockResolvedValueOnce('retry A')
    const getModel = memoizeAsync(load)
    const modelA = getModel('A')
    const modelB = getModel('B')
    const rejected = expect(modelA).rejects.toBe('failed A')
    failed.reject('failed A')
    await rejected
    expect(getModel('B')).toBe(modelB)
    expect(await getModel('A')).toBe('retry A')
    retained.resolve('B')
    expect(await modelB).toBe('B')
    expect(getModel('B')).toBe(modelB)
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('should retry a rejected custom key while preserving another resolved key', async () => {
    const load = vi
      .fn<(request: ModelRequest) => Promise<string>>()
      .mockResolvedValueOnce('B')
      .mockRejectedValueOnce(new Error('failed A'))
      .mockResolvedValueOnce('A')
    const getModel = memoizeAsync(load, {getCacheKey: (request) => request.id})
    const modelB = getModel({id: 'B'})
    await modelB
    await expect(getModel({id: 'A'})).rejects.toThrow('failed A')
    expect(await getModel({id: 'A'})).toBe('A')
    expect(getModel({id: 'B'})).toBe(modelB)
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('should expose a synchronous callback failure as a rejection and allow retry', async () => {
    const error = new Error('synchronous failure')
    const load = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => {
        throw error
      })
      .mockResolvedValueOnce('retry')
    const getModel = memoizeAsync(load)
    await expect(getModel()).rejects.toBe(error)
    expect(await getModel()).toBe('retry')
  })

  it('should cache a fulfilled undefined value', async () => {
    const load = vi.fn(async () => undefined)
    const getValue = memoizeAsync(load)
    const first = getValue()
    await expect(first).resolves.toBeUndefined()
    expect(getValue()).toBe(first)
    expect(load).toHaveBeenCalledOnce()
  })

  it('should preserve optional argument and result types', async () => {
    const getValue = memoizeAsync(async (id?: string) => id)
    expectTypeOf(getValue).parameters.toEqualTypeOf<[id?: string]>()
    expectTypeOf(getValue()).toEqualTypeOf<Promise<string | undefined>>()
    expect(await getValue('A')).toBe('A')
    expect(await getValue()).toBeUndefined()
  })
})
