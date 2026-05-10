/**
 * @vitest-environment jsdom
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {type DeepPosition, getDeepPositionKey} from 'src/utils/focus-controller/deep-position'

const mocks = vi.hoisted(() => {
  return {
    useDelegatedOn: vi.fn(),
  }
})

vi.mock('../DelegatedEvent', async () => {
  const actual = await vi.importActual<typeof import('../DelegatedEvent')>('../DelegatedEvent')

  return {
    ...actual,
    useDelegatedOn: mocks.useDelegatedOn,
  }
})

type AnyFn = (...args: unknown[]) => unknown

const isNonAccessorFunction = (value: unknown): value is AnyFn => {
  if (typeof value !== 'function') {
    return false
  }

  // nonAccessor attaches Symbol('non-accessor') to the function.
  // We must not rely on symbol identity across module instances.
  for (const symbolKey of Object.getOwnPropertySymbols(value)) {
    if (symbolKey.description === 'non-accessor' && (value as any)[symbolKey] === true) {
      return true
    }
  }

  return false
}

const resolveMaybeAccessor = <T>(value: unknown): (() => T) => {
  if (
    typeof value === 'function' &&
    isNonAccessorFunction(value) === false &&
    (value as AnyFn).length === 0
  ) {
    return value as () => T
  }

  return () => value as T
}

const createFocusControllerMock = () => {
  return {
    active: vi.fn(),
    deepPosition: [],
    moveFocus: vi.fn(() => null),
    positionMap: new Map(),
    registerFocus: vi.fn(),
    setActiveFocus: vi.fn(),
    setFocus: vi.fn(),
    setPreventMoveFocus: vi.fn(),
    setPreviousFocus: vi.fn(),
    unregisterFocus: vi.fn(),
  }
}

const importSubject = (options?: {useContextReturnsNull?: boolean}) => {
  vi.resetModules()

  if (options?.useContextReturnsNull === true) {
    vi.doMock('solid-js', async () => {
      const actual = await vi.importActual<typeof import('solid-js')>('solid-js')

      return {
        ...actual,
        useContext: () => null,
      }
    })
  }

  return import('../focus')
}

describe('useFocus', () => {
  beforeEach(() => {
    mocks.useDelegatedOn.mockReset()
  })

  afterEach(() => {
    vi.doUnmock('solid-js')
  })

  const setupWithProvider = async () => {
    const {useFocus} = await importSubject()
    const {FocusControllerContext, FOCUS_CONTROLLER_CHANNEL} = await import('../FocusController')

    const deepPosition: DeepPosition = [
      {x: 1, y: 2},
      {x: 3, y: 4},
    ]

    const focusController = createFocusControllerMock()
    const id = 'test-id'
    const keyOptions = {connector: '|', separator: ','}
    const globalMap = true

    let api: ReturnType<typeof useFocus> | undefined
    let captured:
      | {
          channel: () => string
          key: () => string
          listener: () => ((value: any) => void) | undefined
          options: unknown
        }
      | undefined

    mocks.useDelegatedOn.mockImplementation(
      (channel: unknown, key: unknown, listener: unknown, options: unknown) => {
        captured = {
          channel: resolveMaybeAccessor(channel),
          key: resolveMaybeAccessor(key),
          listener: resolveMaybeAccessor(listener),
          options,
        }
      },
    )

    const {unmount} = render(() =>
      createComponent(FocusControllerContext.Provider, {
        get children() {
          return createComponent(() => {
            api = useFocus(deepPosition)

            return null
          }, {})
        },
        value: {
          focusController: focusController as any,
          globalMap,
          id,
          keyOptions,
        },
      }),
    )

    await Promise.resolve()

    if (api === undefined || captured === undefined) {
      throw new Error('useFocus test setup failed')
    }

    const listener = captured.listener()

    if (listener === undefined) {
      throw new Error('useFocus delegated listener is missing')
    }

    return {
      api,
      captured,
      deepPosition,
      FOCUS_CONTROLLER_CHANNEL,
      focusController,
      globalMap,
      id,
      keyOptions,
      listener,
      unmount,
    }
  }

  it('should fall back to local signals when FocusControllerContext is missing', async () => {
    const {useFocus} = await importSubject({useContextReturnsNull: true})
    const deepPosition: DeepPosition = [{x: 1, y: 2}]
    let api: ReturnType<typeof useFocus> | undefined

    const {unmount} = render(() => {
      api = useFocus(deepPosition)

      return null
    })

    expect(api).toBeDefined()
    expect(api?.isFocused()).toBe(false)
    expect(api?.payload()).toBe(null)
    api?.setIsFocused(true)
    expect(api?.isFocused()).toBe(true)
    api?.setIsFocused(false)
    expect(api?.isFocused()).toBe(false)
    unmount()
  })

  it('should register focus on mount', async () => {
    const {deepPosition, focusController, unmount} = await setupWithProvider()

    expect(focusController.registerFocus).toHaveBeenCalledTimes(1)
    expect(focusController.registerFocus).toHaveBeenCalledWith(deepPosition)
    unmount()
  })

  it('should update focused state and payload from delegated events', async () => {
    const {api, listener, unmount} = await setupWithProvider()

    expect(api?.isFocused()).toBe(false)
    expect(api?.payload()).toBe(null)

    const payload1 = {hello: 'world'}

    listener({focused: true, payload: payload1})
    expect(api?.isFocused()).toBe(true)
    expect(api?.payload()).toEqual(payload1)
    listener({focused: false, payload: {ignored: true}})
    expect(api?.isFocused()).toBe(false)
    expect(api?.payload()).toBe(null)
    unmount()
  })

  it('should proxy setIsFocused to focusController.setFocus', async () => {
    const {api, deepPosition, focusController, unmount} = await setupWithProvider()

    api?.setIsFocused(true)
    expect(focusController.setFocus).toHaveBeenCalledWith(deepPosition)
    api?.setIsFocused(false)
    expect(focusController.setFocus).toHaveBeenCalledWith([])
    unmount()
  })

  it('should use delegated channel and key options', async () => {
    const {captured, deepPosition, globalMap, id, keyOptions, FOCUS_CONTROLLER_CHANNEL, unmount} =
      await setupWithProvider()

    expect(mocks.useDelegatedOn).toHaveBeenCalledTimes(1)
    expect(captured?.channel()).toBe(FOCUS_CONTROLLER_CHANNEL)
    expect(captured?.options).toEqual({globalMap})

    const expectedKey = getDeepPositionKey(deepPosition, {...keyOptions, id})

    expect(captured?.key()).toBe(expectedKey)
    unmount()
  })

  it('should use the focus-controller delegated channel', async () => {
    const {useFocus} = await importSubject()
    const {FocusControllerContext, FOCUS_CONTROLLER_CHANNEL} = await import('../FocusController')

    const deepPosition: DeepPosition = [{x: 1, y: 2}]
    const focusController = createFocusControllerMock()

    mocks.useDelegatedOn.mockImplementation((channel: unknown) => {
      const channelValue = resolveMaybeAccessor<string>(channel)()

      expect(channelValue).toBe(FOCUS_CONTROLLER_CHANNEL)
      expect(channelValue).not.toBe('')
    })

    const {unmount} = render(() =>
      createComponent(FocusControllerContext.Provider, {
        get children() {
          return createComponent(() => {
            useFocus(deepPosition)

            return null
          }, {})
        },
        value: {
          focusController: focusController as any,
          globalMap: false,
          id: 'id',
          keyOptions: {},
        },
      }),
    )

    await Promise.resolve()
    unmount()
  })
})
