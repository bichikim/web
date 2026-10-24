/**
 * @vitest-environment jsdom
 */

import {afterEach, describe, expect, it, vi} from 'vitest'
import {useStorage} from '../index'
import {batch, createRoot, createSignal} from 'solid-js'
import {getAnyStorageItem, setAnyStorageItem} from '@winter-love/utils'

vi.mock('@winter-love/utils', () => ({
  getAnyStorageItem: vi.fn(),
  getStorageItem: vi.fn(),
  setAnyStorageItem: vi.fn(),
  setStorageItem: vi.fn(),
}))

describe('useStorage local', () => {
  it('should persist inactive edits on activation without deferred mounting', () => {
    vi.mocked(getAnyStorageItem).mockReturnValue('stored-value')
    const api = createRoot((dispose) => {
      const [active, setActive] = createSignal(false)
      const [value, setValue] = useStorage<string>('local', 'key', {active})
      return {dispose, setActive, setValue, value}
    })
    try {
      api.setValue('edited-value')
      expect(setAnyStorageItem).not.toHaveBeenCalled()
      api.setActive(true)
      expect(api.value()).toBe('edited-value')
      expect(setAnyStorageItem).toHaveBeenCalledWith(
        'local',
        'key',
        'edited-value',
        expect.any(Object),
      )
    } finally {
      api.dispose()
    }
  })

  it('should read the current key if it changes before mount', () => {
    vi.mocked(getAnyStorageItem).mockImplementation((_kind, key) => `${key}-value`)
    const api = createRoot((dispose) => {
      const [key, setKey] = createSignal('first')
      const [value, setValue] = useStorage<string>('local', key)
      setKey('second')
      return {dispose, setValue, value}
    })
    try {
      expect(api.value()).toBe('second-value')
      api.setValue((previous) => `${previous}-edited`)
      expect(setAnyStorageItem).toHaveBeenLastCalledWith(
        'local',
        'second',
        'second-value-edited',
        {},
      )
    } finally {
      api.dispose()
    }
  })

  afterEach(() => {
    vi.mocked(getAnyStorageItem).mockRestore()
    vi.mocked(setAnyStorageItem).mockRestore()
  })

  it('should preserve and persist the enforced value when the key changes', () => {
    vi.mocked(getAnyStorageItem).mockReturnValue('stored-value')
    const api = createRoot((dispose) => {
      const [key, setKey] = createSignal('first-key')
      const [value] = useStorage('local', key, {enforceValue: false})
      return {dispose, setKey, value}
    })
    try {
      api.setKey('second-key')
      expect(api.value()).toBe(false)
      expect(setAnyStorageItem).toHaveBeenLastCalledWith(
        'local',
        'second-key',
        false,
        expect.objectContaining({enforceValue: false}),
      )
    } finally {
      api.dispose()
    }
  })

  it('should restore the enforced value when reactivated after an explicit edit', () => {
    const api = createRoot((dispose) => {
      const [active, setActive] = createSignal(true)
      const [value, setValue] = useStorage('local', 'key', {active, enforceValue: false})
      return {dispose, setActive, setValue, value}
    })
    try {
      api.setActive(false)
      api.setValue(true)
      api.setActive(true)
      expect(api.value()).toBe(false)
      expect(setAnyStorageItem).toHaveBeenLastCalledWith(
        'local',
        'key',
        false,
        expect.objectContaining({enforceValue: false}),
      )
    } finally {
      api.dispose()
    }
  })

  it('should defer storage reads and writes until mount when called during setup', () => {
    createRoot((dispose) => {
      const [, setValue] = useStorage<string>('local', 'key', {mounted: true})
      setValue('setup-value')
      expect(getAnyStorageItem).not.toHaveBeenCalled()
      expect(setAnyStorageItem).not.toHaveBeenCalled()
      dispose()
    })
  })

  it('should enforce an explicitly supplied undefined value', () => {
    vi.mocked(getAnyStorageItem).mockReturnValue('stored-value')
    const api = createRoot((dispose) => {
      const [value] = useStorage<string | undefined>('local', 'key', {enforceValue: undefined})
      return {dispose, value}
    })
    try {
      expect(api.value()).toBeUndefined()
      expect(setAnyStorageItem).toHaveBeenCalledWith(
        'local',
        'key',
        undefined,
        expect.objectContaining({enforceValue: undefined}),
      )
    } finally {
      api.dispose()
    }
  })

  it.each(['value', 'updater'] as const)(
    'should preserve the previous key when a batched key change uses the %s setter',
    (setterKind) => {
      const stored = new Map([
        ['first-key', 'first-value'],
        ['second-key', 'second-value'],
      ])
      vi.mocked(getAnyStorageItem).mockImplementation((_kind, key) => stored.get(key))
      vi.mocked(setAnyStorageItem).mockImplementation((_kind, key, value) => {
        stored.set(key, value)
      })
      const api = createRoot((dispose) => {
        const [key, setKey] = createSignal('first-key')
        const [value, setValue] = useStorage<string>('local', key)

        return {dispose, setKey, setValue, value}
      })

      try {
        batch(() => {
          api.setKey('second-key')
          if (setterKind === 'value') {
            api.setValue('edited-value')
          } else {
            api.setValue((previous) => `${previous}-edited`)
          }
        })

        const expected = setterKind === 'value' ? 'edited-value' : 'second-value-edited'
        expect(stored.get('first-key')).toBe('first-value')
        expect(stored.get('second-key')).toBe(expected)
        expect(api.value()).toBe(expected)
        expect(setAnyStorageItem).toHaveBeenCalledTimes(1)
      } finally {
        api.dispose()
      }
    },
  )

  it('should retain an inactive edit made during a batched key change until activation', () => {
    vi.mocked(getAnyStorageItem).mockReturnValue('stored-value')
    const api = createRoot((dispose) => {
      const [key, setKey] = createSignal('first-key')
      const [active, setActive] = createSignal(false)
      const [value, setValue] = useStorage<string>('local', key, {
        active,
        initValue: 'initial-value',
        mounted: true,
      })

      return {dispose, setActive, setKey, setValue, value}
    })

    try {
      batch(() => {
        api.setKey('second-key')
        api.setValue('edited-value')
      })

      expect(api.value()).toBe('edited-value')
      expect(setAnyStorageItem).not.toHaveBeenCalled()
      api.setActive(true)
      expect(api.value()).toBe('edited-value')
      expect(getAnyStorageItem).not.toHaveBeenCalled()
      expect(setAnyStorageItem).toHaveBeenCalledWith(
        'local',
        'second-key',
        'edited-value',
        expect.objectContaining({mounted: true}),
      )
    } finally {
      api.dispose()
    }
  })

  it('should return stored data when data exists', () => {
    const key = 'key'
    const storeValue = 'value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key)

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(storeValue)
    dispose()
  })

  it('should return null when data does not exist', () => {
    const key = 'key'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(null)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key)

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(null)
    dispose()
  })

  it('should return initValue when storage is empty but initValue exists', () => {
    const key = 'key'
    const initValue = 'init-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(initValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {initValue})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, initValue)
    expect(value()).toBe(initValue)
    dispose()
  })

  it('should call getAnyStorageItem after mounted when mounted option is true', () => {
    const key = 'key'
    const storeValue = 'store-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {mounted: true})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(storeValue)
    dispose()
  })

  it('should enforce value when enforceValue option exists', () => {
    const key = 'key'
    const enforceValue = 'enforce-value'
    const storeValue = 'store-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {enforceValue})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenNthCalledWith(1, 'local', key, null)
    expect(value()).toBe(enforceValue)
    dispose()
  })

  it.each([false, 0, ''])('should enforce and persist the falsy value %j', (enforceValue) => {
    const key = 'key'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce('stored-value')

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {enforceValue})

      return {dispose, value}
    })

    expect(value()).toBe(enforceValue)
    expect(setAnyStorageItem).toHaveBeenCalledWith(
      'local',
      key,
      enforceValue,
      expect.objectContaining({enforceValue}),
    )
    dispose()
  })

  it('should persist an enforced value when storage becomes active', () => {
    const {dispose, setActive, value} = createRoot((dispose) => {
      const [active, setActive] = createSignal(false)
      const [value] = useStorage('local', 'key', {active, enforceValue: false})

      return {dispose, setActive, value}
    })

    expect(value()).toBe(false)
    expect(setAnyStorageItem).not.toHaveBeenCalled()

    setActive(true)

    expect(setAnyStorageItem).toHaveBeenCalledWith(
      'local',
      'key',
      false,
      expect.objectContaining({enforceValue: false}),
    )
    dispose()
  })

  it('should rehydrate when a reactive key changes and persist to the new key', () => {
    vi.mocked(getAnyStorageItem)
      .mockReturnValueOnce('first-value')
      .mockReturnValueOnce('second-value')

    const {dispose, setKey, setValue, value} = createRoot((dispose) => {
      const [key, setKey] = createSignal('first-key')
      const [value, setValue] = useStorage('local', key)

      return {dispose, setKey, setValue, value}
    })

    expect(value()).toBe('first-value')

    setKey('second-key')

    expect(getAnyStorageItem).toHaveBeenLastCalledWith('local', 'second-key', null)
    expect(value()).toBe('second-value')

    setValue('updated-second-value')

    expect(setAnyStorageItem).toHaveBeenLastCalledWith(
      'local',
      'second-key',
      'updated-second-value',
      {},
    )
    dispose()
  })

  it('should skip localStorage read on mount when active is false', () => {
    const key = 'key'
    const initValue: string[] = []

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {active: false, initValue, mounted: true})

      return {dispose, value}
    })

    expect(getAnyStorageItem).not.toHaveBeenCalled()
    expect(value()).toBe(initValue)
    dispose()
  })

  it('should read localStorage on mount when active is true', () => {
    const key = 'key'
    const storeValue = 'store-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value} = createRoot((dispose) => {
      const [value] = useStorage('local', key, {active: true, mounted: true})

      return {dispose, value}
    })

    expect(getAnyStorageItem).toHaveBeenCalledWith('local', key, null)
    expect(value()).toBe(storeValue)
    dispose()
  })

  it('should persist in-memory value when active becomes true after inactive edits', () => {
    const key = 'key'
    const editedValue = 'edited-while-inactive'
    const initValue = 'init-value'

    const {dispose, setActive, setValue, value} = createRoot((dispose) => {
      const [active, setActive] = createSignal(false)
      const [value, setValue] = useStorage('local', key, {active, initValue, mounted: true})

      return {dispose, setActive, setValue, value}
    })

    setValue(editedValue)
    setActive(true)

    expect(getAnyStorageItem).not.toHaveBeenCalled()
    expect(setAnyStorageItem).toHaveBeenCalledWith(
      'local',
      key,
      editedValue,
      expect.objectContaining({initValue, mounted: true}),
    )
    expect(value()).toBe(editedValue)
    dispose()
  })

  it('should re-hydrate from localStorage when active becomes true after mount', () => {
    const key = 'key'
    const storedValue = 'stored-value'
    const initValue = 'init-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storedValue)

    const {dispose, setActive, value} = createRoot((dispose) => {
      const [active, setActive] = createSignal(false)
      const [value] = useStorage('local', key, {active, initValue, mounted: true})

      return {dispose, setActive, value}
    })

    setActive(true)
    expect(getAnyStorageItem).toHaveBeenCalledWith('local', key, initValue)
    expect(value()).toBe(storedValue)
    dispose()
  })

  it('should update and save value to store when setValue is called', () => {
    const key = 'key'
    const storeValue = 'store-value'
    const newValue = 'new-value'

    vi.mocked(getAnyStorageItem).mockReturnValueOnce(storeValue)

    const {dispose, value, setValue} = createRoot((dispose) => {
      const [value, setValue] = useStorage('local', key)

      return {dispose, setValue, value}
    })

    expect(value()).toBe(storeValue)
    setValue(newValue)
    expect(setAnyStorageItem).toHaveBeenCalledWith('local', key, newValue, {})
    expect(value()).toBe(newValue)
    dispose()
  })
})
