import {describe, expect, it, vi} from 'vitest'
import {createFocusController} from '../focus-controller'
import {getDirection} from '../direction'
import {type DeepPosition, getDeepPositionKey} from '../deep-position'
import {getDeepPositionInfoWithKey, hasDeepPosition, isPreventMoveFocus} from '../position-map'

const ROOT_KEY = getDeepPositionKey([])

describe('focus-controller', () => {
  it('should create a focus controller', () => {
    const focusController = createFocusController()

    expect(focusController).toBeDefined()
    expect(focusController.deepPosition).toEqual([])
  })

  it('exposes the committed nested path inside focus callbacks', () => {
    const observed: {current: DeepPosition; focused: boolean; path: DeepPosition}[] = []
    const focusController = createFocusController((path, focused) => {
      observed.push({current: focusController.deepPosition, focused, path})
    })
    const target: DeepPosition = [
      {x: 1, y: 0},
      {x: 2, y: 3},
    ]

    focusController.registerFocus(target)
    focusController.setFocus(target)

    expect(focusController.deepPosition).toEqual(target)
    expect(focusController.deepPosition).not.toBe(target)
    expect(observed).toEqual([
      {current: target, focused: false, path: []},
      {current: target, focused: true, path: target},
    ])
  })

  it('retains the current path when an unregistered target is rejected', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)
    const start: DeepPosition = [{x: 0, y: 0}]

    focusController.registerFocus(start)
    focusController.setFocus(start)
    onChangeFocus.mockClear()
    focusController.setFocus([{x: 9, y: 9}])

    expect(focusController.deepPosition).toEqual(start)
    expect(onChangeFocus).not.toHaveBeenCalled()
  })

  it('should register deep position', () => {
    const focusController = createFocusController()

    const deepPosition: DeepPosition = [
      {x: 0, y: 0},
      {x: 1, y: 1},
    ]

    focusController.registerFocus(deepPosition)
    expect(hasDeepPosition(focusController.positionMap, deepPosition)).toBe(true)
    expect(hasDeepPosition(focusController.positionMap, [{x: 0, y: 0}])).toBe(true)
    expect(hasDeepPosition(focusController.positionMap, [])).toBe(true)
  })

  it('should unregister deep position', () => {
    const focusController = createFocusController()

    const deepPosition: DeepPosition = [
      {x: 0, y: 0},
      {x: 1, y: 1},
    ]

    focusController.registerFocus(deepPosition)
    focusController.unregisterFocus(deepPosition)
    expect(hasDeepPosition(focusController.positionMap, deepPosition)).toBe(false)
    expect(hasDeepPosition(focusController.positionMap, [{x: 0, y: 0}])).toBe(false)
    expect(hasDeepPosition(focusController.positionMap, [])).toBe(false)
  })

  it('should set focus deep position', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)

    const first: DeepPosition = [{x: 0, y: 0}]
    const second: DeepPosition = [{x: 1, y: 0}]

    focusController.registerFocus(first)
    focusController.registerFocus(second)
    focusController.setFocus(first)
    expect(onChangeFocus).toHaveBeenNthCalledWith(1, [], false)
    expect(onChangeFocus).toHaveBeenNthCalledWith(2, first, true)
    expect(focusController.deepPosition).toEqual(first)
    expect(
      getDeepPositionInfoWithKey(focusController.positionMap, ROOT_KEY)?.previousChildPosition,
    ).toBeUndefined()
    onChangeFocus.mockClear()
    focusController.setFocus(second)
    expect(onChangeFocus).toHaveBeenNthCalledWith(1, first, false)
    expect(onChangeFocus).toHaveBeenNthCalledWith(2, second, true)
    expect(focusController.deepPosition).toEqual(second)
    expect(
      getDeepPositionInfoWithKey(focusController.positionMap, ROOT_KEY)?.previousChildPosition,
    ).toEqual(first[0])
  })

  it('should move deep position', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)

    const start: DeepPosition = [{x: 0, y: 0}]
    const next: DeepPosition = [{x: 1, y: 0}]

    focusController.registerFocus(start)
    focusController.registerFocus(next)
    focusController.setFocus(start)
    onChangeFocus.mockClear()
    const result = focusController.moveFocus(getDirection('right'), {})

    expect(result).toEqual(next)
    expect(focusController.deepPosition).toEqual(result)
    expect(onChangeFocus).toHaveBeenNthCalledWith(1, start, false)
    expect(onChangeFocus).toHaveBeenNthCalledWith(2, next, true)
  })

  it('should set active focus deep position', () => {
    const focusController = createFocusController()

    const deepPosition: DeepPosition = [{x: 0, y: 0}]

    focusController.registerFocus(deepPosition)
    expect(hasDeepPosition(focusController.positionMap, deepPosition)).toBe(true)
    focusController.setActiveFocus(deepPosition, false)
    expect(hasDeepPosition(focusController.positionMap, deepPosition)).toBe(false)
    focusController.setActiveFocus(deepPosition, true)
    expect(hasDeepPosition(focusController.positionMap, deepPosition)).toBe(true)
  })

  it('registers prevent move flags on a deep position', () => {
    const focusController = createFocusController()

    const deepPosition: DeepPosition = [{x: 0, y: 0}]

    focusController.registerFocus(deepPosition)
    focusController.setPreventMoveFocus(deepPosition, {right: true})
    expect(
      isPreventMoveFocus(focusController.positionMap, deepPosition, getDirection('right')),
    ).toBe(true)
    expect(
      isPreventMoveFocus(focusController.positionMap, deepPosition, getDirection('left')),
    ).toBe(false)
  })

  it('should set previous focus deep position', () => {
    const focusController = createFocusController()

    const deepPosition: DeepPosition = [
      {x: 0, y: 0},
      {x: 1, y: 1},
    ]

    focusController.setPreviousFocus(deepPosition)
    const parentKey = getDeepPositionKey([{x: 0, y: 0}])

    expect(
      getDeepPositionInfoWithKey(focusController.positionMap, parentKey)?.previousChildPosition,
    ).toEqual({
      x: 1,
      y: 1,
    })

    expect(
      getDeepPositionInfoWithKey(focusController.positionMap, ROOT_KEY)?.previousChildPosition,
    ).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('should active focus controller', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)

    const first: DeepPosition = [{x: 0, y: 0}]
    const second: DeepPosition = [{x: 1, y: 0}]

    focusController.registerFocus(first)
    focusController.registerFocus(second)
    focusController.setFocus(first)
    onChangeFocus.mockClear()
    focusController.active(false)
    focusController.setFocus(second)
    expect(onChangeFocus).not.toHaveBeenCalled()
    expect(focusController.deepPosition).toEqual(first)
    focusController.setFocus(second, {ignoreFocusControllerActive: true})
    expect(onChangeFocus).toHaveBeenNthCalledWith(1, first, false)
    expect(onChangeFocus).toHaveBeenNthCalledWith(2, second, true)
    expect(focusController.deepPosition).toEqual(second)
  })

  it('should set focus when ignoring missing deep position', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)

    const deepPosition: DeepPosition = [{x: 9, y: 9}]

    focusController.setFocus(deepPosition)
    expect(onChangeFocus).not.toHaveBeenCalled()
    focusController.setFocus(deepPosition, {ignoreHasDeepPosition: true})
    expect(onChangeFocus).toHaveBeenNthCalledWith(1, [], false)
    expect(onChangeFocus).toHaveBeenNthCalledWith(2, deepPosition, true)
  })

  it('should not call onChangeFocus when prevented', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)

    const deepPosition: DeepPosition = [{x: 0, y: 0}]

    focusController.registerFocus(deepPosition)
    focusController.setFocus(deepPosition, {preventCallChangeFocus: true})
    expect(focusController.deepPosition).toEqual(deepPosition)
    expect(onChangeFocus).not.toHaveBeenCalled()
  })

  it('should skip saving previous focus when prevented', () => {
    const focusController = createFocusController()

    const first: DeepPosition = [{x: 0, y: 0}]
    const second: DeepPosition = [{x: 1, y: 0}]

    focusController.registerFocus(first)
    focusController.registerFocus(second)
    focusController.setFocus(first)
    expect(
      getDeepPositionInfoWithKey(focusController.positionMap, ROOT_KEY)?.previousChildPosition,
    ).toBeUndefined()
    focusController.setFocus(second, {preventSavePreviousFocus: true})
    expect(
      getDeepPositionInfoWithKey(focusController.positionMap, ROOT_KEY)?.previousChildPosition,
    ).toBeUndefined()
  })

  it('moves focus when prevent move is ignored', () => {
    const onChangeFocus = vi.fn()
    const focusController = createFocusController(onChangeFocus)

    const start: DeepPosition = [{x: 0, y: 0}]
    const next: DeepPosition = [{x: 1, y: 0}]

    focusController.registerFocus(start)
    focusController.registerFocus(next)
    focusController.setFocus(start)
    focusController.setPreventMoveFocus(start, {right: true})
    const blocked = focusController.moveFocus(getDirection('right'), {})

    expect(blocked).toBeNull()
    expect(focusController.deepPosition).toEqual(start)
    expect(onChangeFocus).toHaveBeenCalledTimes(2)
    onChangeFocus.mockClear()
    const result = focusController.moveFocus(getDirection('right'), {
      ignorePreventMoveFocus: true,
    })

    expect(result).toEqual(next)
    expect(focusController.deepPosition).toEqual(result)
    expect(onChangeFocus).toHaveBeenNthCalledWith(1, start, false)
    expect(onChangeFocus).toHaveBeenNthCalledWith(2, next, true)
  })
})
