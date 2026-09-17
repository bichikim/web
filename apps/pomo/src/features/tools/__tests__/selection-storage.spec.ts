import {beforeEach, expect, it, vi} from 'vitest'
import {createToolSelectionStorages, type ToolSelectionStorages} from '../selection-storage'
import {createStorageFixture} from './helpers/storage'

let reportRepairError: ReturnType<typeof vi.fn<(error: unknown) => void>>
let fixture: ReturnType<typeof createStorageFixture>
let unitSelectionStorage: ToolSelectionStorages['unitSelectionStorage']
let lunarDirectionStorage: ToolSelectionStorages['lunarDirectionStorage']
let movingSelectionStorage: ToolSelectionStorages['movingSelectionStorage']
beforeEach(() => {
  reportRepairError = vi.fn()
  fixture = createStorageFixture()
  const repositories = createToolSelectionStorages({reportRepairError, storage: fixture.adapter})
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
  fixture.web.set(key, JSON.stringify(value))
  const repositories = createToolSelectionStorages({reportRepairError, storage: fixture.adapter})
  await expect(repositories[storage].read()).resolves.toEqual(value)
  fixture.web.clear()
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
it('should restore valid native data when the web copy is invalid', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.web.set('pomo:tool-lunar-direction:v1', '"unknown"')
  fixture.getItem.mockResolvedValue('"solar"')
  await expect(lunarDirectionStorage.read()).resolves.toBe('solar')
})
it('should preserve native read errors when there is no web copy', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  fixture.getItem.mockRejectedValue(new Error('read failed'))
  await expect(lunarDirectionStorage.read()).rejects.toThrow('read failed')
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
  const independent = createToolSelectionStorages({
    reportRepairError: vi.fn(),
    storage: other.adapter,
  })
  try {
    await expect(independent.lunarDirectionStorage.read()).resolves.toBeNull()
    await expect(movingSelectionStorage.read()).resolves.toBeNull()
  } finally {
    delayed.resolve()
    await saving
  }
})

it.each([null, JSON.stringify('solar')])(
  'should repair native %s before web data is cleared',
  async (stored) => {
    fixture.usesTossStorage.mockReturnValue(true)
    const latest = 'lunar'
    fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify(latest))
    let nativeValue = stored
    fixture.getItem.mockImplementation(async () => nativeValue)
    fixture.setItem.mockImplementation(async (_key, value) => {
      nativeValue = value
    })
    await expect(lunarDirectionStorage.read()).resolves.toEqual(latest)
    fixture.web.clear()
    await expect(lunarDirectionStorage.read()).resolves.toEqual(latest)
  },
)
it('should retry a failed repair on the next read while preserving the web value', async () => {
  fixture.usesTossStorage.mockReturnValue(true)
  const latest = 'lunar'
  const error = new Error('repair failed')
  fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify(latest))
  fixture.setItem.mockRejectedValueOnce(error)
  await expect(lunarDirectionStorage.read()).resolves.toEqual(latest)
  await expect(lunarDirectionStorage.read()).resolves.toEqual(latest)
  fixture.web.clear()
  await expect(lunarDirectionStorage.read()).resolves.toEqual(latest)
  expect(reportRepairError).toHaveBeenCalledExactlyOnceWith(error)
})
it('should avoid native repair on the regular web', async () => {
  const latest = 'lunar'
  fixture.web.set('pomo:tool-lunar-direction:v1', JSON.stringify(latest))
  await expect(lunarDirectionStorage.read()).resolves.toEqual(latest)
  expect(fixture.setItem).not.toHaveBeenCalled()
})
