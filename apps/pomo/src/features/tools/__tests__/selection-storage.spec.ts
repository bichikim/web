import {beforeEach, expect, it, vi} from 'vitest'
import {createToolSelectionStorages, type ToolSelectionStorages} from '../selection-storage'
import {createStorageFixture} from './helpers/storage'

let fixture: ReturnType<typeof createStorageFixture>
let unitSelectionStorage: ToolSelectionStorages['unitSelectionStorage']
let lunarDirectionStorage: ToolSelectionStorages['lunarDirectionStorage']
let movingSelectionStorage: ToolSelectionStorages['movingSelectionStorage']
beforeEach(() => {
  fixture = createStorageFixture()
  const repositories = createToolSelectionStorages({storage: fixture.adapter})
  unitSelectionStorage = repositories.unitSelectionStorage
  lunarDirectionStorage = repositories.lunarDirectionStorage
  movingSelectionStorage = repositories.movingSelectionStorage
})
it('should restore each tool selection independently', async () => {
  const units = {category: 'area', from: 'pyeong', to: 'm2'} as const
  await unitSelectionStorage.write(units)
  await lunarDirectionStorage.write('lunar')
  await movingSelectionStorage.write({month: '5', year: '2027'})
  await expect(unitSelectionStorage.read()).resolves.toEqual(units)
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
  await expect(movingSelectionStorage.read()).resolves.toEqual({month: '5', year: '2027'})
})
it('should reject mismatched units, unknown directions and unsupported months', async () => {
  fixture.web.set('pomo:tool-units:v1', JSON.stringify({category: 'length', from: 'kg', to: 'm'}))
  fixture.web.set('pomo:tool-lunar-direction:v1', '"unknown"')
  fixture.web.set('pomo:tool-moving:v1', JSON.stringify({month: '13', year: '2051'}))
  await expect(unitSelectionStorage.read()).resolves.toBeNull()
  await expect(lunarDirectionStorage.read()).resolves.toBeNull()
  await expect(movingSelectionStorage.read()).resolves.toBeNull()
})
it('should use native storage and restore after a pending native save', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  let complete: (() => void) | undefined
  let stored = '"solar"'
  fixture.getItem.mockImplementation(() => Promise.resolve(stored))
  fixture.setItem.mockImplementation(
    (_key: string, value: string) =>
      new Promise<void>((resolve) => {
        complete = () => {
          stored = value
          resolve()
        }
      }),
  )
  const saving = lunarDirectionStorage.write('lunar')
  await vi.waitFor(() => expect(fixture.setItem).toHaveBeenCalled())
  const restoring = lunarDirectionStorage.read()
  complete?.()
  await saving
  await expect(restoring).resolves.toBe('lunar')
})
it.each([
  {
    key: 'pomo:tool-units:v1',
    storage: 'unitSelectionStorage' as const,
    value: {category: 'area', from: 'pyeong', to: 'm2'},
  },
  {key: 'pomo:tool-lunar-direction:v1', storage: 'lunarDirectionStorage' as const, value: 'lunar'},
  {
    key: 'pomo:tool-moving:v1',
    storage: 'movingSelectionStorage' as const,
    value: {month: '5', year: '2027'},
  },
])('should restore the web copy for $key when native is missing', async ({storage, key, value}) => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockResolvedValue(null)
  fixture.web.set(key, JSON.stringify(value))
  const repositories = createToolSelectionStorages({storage: fixture.adapter})
  await expect(repositories[storage].read()).resolves.toEqual(value)
})
it.each(['"solar"', '{invalid', '"unknown"'])(
  'should prefer web selection over native %s',
  async (stored) => {
    fixture.usesTossStorage.mockReturnValue(true)
    fixture.getItem.mockResolvedValue(stored)
    fixture.web.set('pomo:tool-lunar-direction:v1', '"lunar"')
    await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
  },
)
it('should restore the web copy after native persistence fails', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.setItem.mockRejectedValue(new Error('native unavailable'))
  await expect(lunarDirectionStorage.write('lunar')).rejects.toThrow('native unavailable')
  fixture.getItem.mockResolvedValue(null)
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
})
it('should return a selection saved during a native read', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const delayed = Promise.withResolvers<string | null>()
  fixture.getItem.mockReturnValueOnce(delayed.promise)
  const reading = lunarDirectionStorage.read()
  await vi.waitFor(() => expect(fixture.getItem).toHaveBeenCalled())
  await lunarDirectionStorage.write('lunar')
  delayed.resolve('"solar"')
  await expect(reading).resolves.toBe('lunar')
})
it('should restore valid native data when the web copy is invalid', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.web.set('pomo:tool-lunar-direction:v1', '"unknown"')
  fixture.getItem.mockResolvedValue('"solar"')
  await expect(lunarDirectionStorage.read()).resolves.toBe('solar')
})
it('should retry a stale native read when browser storage is unavailable', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  const delayed = Promise.withResolvers<string | null>()
  fixture.getItem.mockReturnValueOnce(delayed.promise).mockResolvedValue('"lunar"')
  const reading = lunarDirectionStorage.read()
  await vi.waitFor(() => expect(fixture.getItem).toHaveBeenCalled())
  await lunarDirectionStorage.write('lunar')
  delayed.resolve('"solar"')
  await expect(reading).resolves.toBe('lunar')
})
it('should preserve native read errors when there is no web copy', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockRejectedValue(new Error('read failed'))
  await expect(lunarDirectionStorage.read()).rejects.toThrow('read failed')
})
it('should return a concurrent save even when the old native read rejects', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const delayed = Promise.withResolvers<string | null>()
  fixture.getItem.mockReturnValueOnce(delayed.promise)
  const reading = lunarDirectionStorage.read()
  await vi.waitFor(() => expect(fixture.getItem).toHaveBeenCalled())
  await lunarDirectionStorage.write('lunar')
  delayed.reject(new Error('read failed'))
  await expect(reading).resolves.toBe('lunar')
})
it('should restore the native save when replacing an existing web copy fails', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.web.set('pomo:tool-lunar-direction:v1', '"solar"')
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.getItem.mockResolvedValue('"lunar"')
  await lunarDirectionStorage.write('lunar')
  await expect(lunarDirectionStorage.read()).resolves.toBe('lunar')
})

it('should preserve the existing web copy when both writes fail', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = 'solar'
  const next = 'lunar'
  fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify(previous))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.setItem.mockRejectedValue(new Error('native failed'))
  await expect(lunarDirectionStorage.write(next)).rejects.toThrow('native failed')
  await expect(lunarDirectionStorage.read()).resolves.toEqual(previous)
})
it('should wait for native persistence before restoring after web replacement fails', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = 'solar'
  const next = 'lunar'
  fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify(previous))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  const delayed = Promise.withResolvers<void>()
  fixture.setItem.mockReturnValue(delayed.promise)
  fixture.getItem.mockResolvedValue(JSON.stringify(next))
  const saving = lunarDirectionStorage.write(next)
  const reading = lunarDirectionStorage.read()
  delayed.resolve()
  await saving
  await expect(reading).resolves.toEqual(next)
})
it('should retain a newer web save after an older native write completes', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = 'solar'
  const next = 'lunar'
  fixture.writeWeb.mockReturnValueOnce(new Error('blocked'))
  const delayed = Promise.withResolvers<void>()
  fixture.setItem.mockReturnValueOnce(delayed.promise).mockResolvedValue(undefined)
  const first = lunarDirectionStorage.write(previous)
  await vi.waitFor(() => expect(fixture.setItem).toHaveBeenCalled())
  const second = lunarDirectionStorage.write(next)
  delayed.resolve()
  await Promise.all([first, second])
  expect(fixture.web.get('pomo:tool-lunar-direction:v1')).toBe(JSON.stringify(next))
  await expect(lunarDirectionStorage.read()).resolves.toEqual(next)
})
it('should report an error if a readable stale web copy cannot be removed', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const previous = 'solar'
  const next = 'lunar'
  fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify(previous))
  fixture.writeWeb.mockReturnValue(new Error('blocked'))
  fixture.removeWeb.mockReturnValue(new Error('blocked'))
  await expect(lunarDirectionStorage.write(next)).rejects.toThrow('Failed to discard stale')
})

it('should isolate pending writes between repository instances and selection keys', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const delayed = Promise.withResolvers<void>()
  fixture.setItem.mockReturnValue(delayed.promise)
  const saving = lunarDirectionStorage.write('lunar')
  const other = createStorageFixture()
  other.usesTossStorage.mockReturnValue(true)
  const independent = createToolSelectionStorages({storage: other.adapter})
  try {
    await expect(independent.lunarDirectionStorage.read()).resolves.toBeNull()
    await expect(movingSelectionStorage.read()).resolves.toBeNull()
  } finally {
    delayed.resolve()
    await saving
  }
})
