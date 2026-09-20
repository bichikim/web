import {expect, it, vi} from 'vitest'
import {createAuthoritativePreferenceRepository} from '..'

const setup = (native = true) => {
  const storage = {
    isNative: () => native,
    readNative: vi.fn(async (): Promise<number | null> => 2),
    readWeb: vi.fn(() => 1),
    writeNative: vi.fn(async (_value: number) => undefined),
    writeWeb: vi.fn((_value: number): unknown | null => null),
  }
  const repository = createAuthoritativePreferenceRepository({
    defaultValue: 0,
    readFailureMessage: 'read failed',
    storage,
    writeFailureMessage: 'write failed',
  })
  return {repository, storage}
}

it('should restore native values and mirror defaults without reading the web copy', async () => {
  const {storage, repository} = setup()
  expect(await repository.read()).toBe(2)
  expect(storage.readWeb).not.toHaveBeenCalled()
  expect(storage.writeWeb).toHaveBeenLastCalledWith(2)
  storage.readNative.mockResolvedValue(null)
  expect(await repository.read()).toBe(0)
  expect(storage.writeWeb).toHaveBeenLastCalledWith(0)
})

it('should ignore mirror failure but preserve native read errors with their cause', async () => {
  const {storage, repository} = setup()
  const failure = new Error('unavailable')
  storage.writeWeb.mockReturnValue(failure)
  expect(await repository.read()).toBe(2)
  storage.readNative.mockRejectedValue(failure)
  await expect(repository.read()).rejects.toMatchObject({cause: failure, message: 'read failed'})
})

it('should require native persistence even when the web write succeeded', async () => {
  const {storage, repository} = setup()
  const failure = new Error('unavailable')
  storage.writeNative.mockImplementation(async () => {
    expect(storage.writeWeb).toHaveBeenCalledWith(3)
    throw failure
  })
  await expect(repository.write(3)).rejects.toMatchObject({cause: failure, message: 'write failed'})
})

it('should accept native persistence despite a failed web copy', async () => {
  const {storage, repository} = setup()
  storage.writeWeb.mockReturnValue(new Error('web unavailable'))
  await expect(repository.write(3)).resolves.toBeUndefined()
  expect(storage.writeNative).toHaveBeenCalledExactlyOnceWith(3)
})

it('should keep web-only reads and write failures independent of native storage', async () => {
  const {storage, repository} = setup(false)
  expect(await repository.read()).toBe(1)
  const failure = new Error('web unavailable')
  storage.writeWeb.mockReturnValue(failure)
  await expect(repository.write(3)).rejects.toMatchObject({cause: failure, message: 'write failed'})
  expect(storage.readNative).not.toHaveBeenCalled()
  expect(storage.writeNative).not.toHaveBeenCalled()
})
