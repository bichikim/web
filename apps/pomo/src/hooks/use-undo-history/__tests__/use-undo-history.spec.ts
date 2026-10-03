/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createComputed, createSignal} from 'solid-js'
import {afterEach, expect, expectTypeOf, it, vi} from 'vitest'
import {useUndoHistory} from '..'

interface TextSnapshot {
  readonly label: string
}

afterEach(cleanup)

it('should leave caller state and empty history unchanged until capture', () => {
  const onChange = vi.fn()
  const valueAccessor = vi.fn(() => 'initial')
  const {result} = renderHook(() => useUndoHistory({onChange, valueAccessor}))

  result.undo()
  result.redo()
  result.reset()
  expect(result.canUndo()).toBe(false)
  expect(result.canRedo()).toBe(false)
  expect(valueAccessor).not.toHaveBeenCalled()
  expect(onChange).not.toHaveBeenCalled()

  result.capture()
  expect(result.canUndo()).toBe(true)
  expect(result.canRedo()).toBe(false)
  expect(valueAccessor).toHaveBeenCalledTimes(1)
  expect(onChange).not.toHaveBeenCalled()
})

it('should record explicit captures and restore the latest caller-owned state on redo', () => {
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal('initial')
    const history = useUndoHistory({onChange: setValue, valueAccessor: value})
    return {history, setValue, value}
  })

  result.history.capture()
  result.setValue('first edit')
  result.setValue('continued edit')
  result.history.undo()
  expect(result.value()).toBe('initial')
  expect(result.history.canUndo()).toBe(false)
  result.history.redo()
  expect(result.value()).toBe('continued edit')
  expect(result.history.canRedo()).toBe(false)
})

it('should discard redo history when capturing a new edit after undo', () => {
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal(0)
    const history = useUndoHistory({onChange: setValue, valueAccessor: value})
    return {history, setValue, value}
  })

  result.history.capture()
  result.setValue(1)
  result.history.capture()
  result.setValue(2)
  result.history.undo()
  result.history.capture()
  result.setValue(3)
  expect(result.history.canRedo()).toBe(false)
  result.history.redo()
  expect(result.value()).toBe(3)
  result.history.undo()
  expect(result.value()).toBe(1)
  result.history.undo()
  expect(result.value()).toBe(0)
})

it.each([1, 2])('should retain only the latest %i captured snapshots', (limit) => {
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal(0)
    const history = useUndoHistory({limit, onChange: setValue, valueAccessor: value})
    return {history, setValue, value}
  })

  for (const value of [1, 2, 3]) {
    result.history.capture()
    result.setValue(value)
  }
  while (result.history.canUndo()) {
    result.history.undo()
  }
  expect(result.value()).toBe(3 - limit)
  while (result.history.canRedo()) {
    result.history.redo()
  }
  expect(result.value()).toBe(3)
  result.history.capture()
  result.setValue(4)
  while (result.history.canUndo()) {
    result.history.undo()
  }
  expect(result.value()).toBe(4 - limit)
})

it('should default to 200 captures and read the configured limit only at creation', () => {
  const {result} = renderHook(() => {
    const [limit, setLimit] = createSignal<number>()
    const [value, setValue] = createSignal(0)
    const history = useUndoHistory({
      get limit() {
        return limit()
      },
      onChange: setValue,
      valueAccessor: value,
    })
    return {history, setLimit, setValue, value}
  })
  result.setLimit(1)
  for (let value = 1; value <= 201; value += 1) {
    result.history.capture()
    result.setValue(value)
  }
  for (let index = 0; index < 200; index += 1) {
    result.history.undo()
  }
  expect(result.value()).toBe(1)
  expect(result.history.canUndo()).toBe(false)
})

it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
  'should reject a limit that is not a positive integer: %s',
  (limit) => {
    expect(() =>
      renderHook(() => useUndoHistory({limit, onChange: vi.fn(), valueAccessor: () => 0})),
    ).toThrow(RangeError)
  },
)

it('should reset both stacks without replacing the current value', () => {
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal(0)
    const history = useUndoHistory({onChange: setValue, valueAccessor: value})
    return {history, setValue, value}
  })

  result.history.capture()
  result.setValue(1)
  result.history.capture()
  result.setValue(2)
  result.history.undo()
  expect(result.history.canUndo()).toBe(true)
  expect(result.history.canRedo()).toBe(true)
  result.history.reset()
  result.history.undo()
  result.history.redo()
  expect(result.history.canUndo()).toBe(false)
  expect(result.history.canRedo()).toBe(false)
  expect(result.value()).toBe(1)
})

it('should restore undefined and null snapshots rather than treating them as empty history', () => {
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal<string | null>()
    const history = useUndoHistory({onChange: setValue, valueAccessor: value})
    return {history, setValue, value}
  })

  result.history.capture()
  result.setValue(null)
  result.history.capture()
  result.setValue('changed')
  result.history.undo()
  expect(result.value()).toBeNull()
  result.history.undo()
  expect(result.value()).toBeUndefined()
  result.history.redo()
  expect(result.value()).toBeNull()
  result.history.redo()
  expect(result.value()).toBe('changed')
  result.setValue(undefined)
  result.history.undo()
  result.history.redo()
  expect(result.value()).toBeUndefined()
  expect(result.history.canRedo()).toBe(false)
})

it('should retain immutable object snapshots by reference and infer their type', () => {
  const initial: TextSnapshot = Object.freeze({label: 'initial'})
  const changed = Object.freeze({label: 'changed'})
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal(initial)
    const history = useUndoHistory({
      onChange: (snapshot) => {
        expectTypeOf(snapshot).toEqualTypeOf<TextSnapshot>()
        setValue(snapshot)
      },
      valueAccessor: value,
    })
    return {history, setValue, value}
  })

  result.history.capture()
  result.setValue(changed)
  result.history.undo()
  expect(result.value()).toBe(initial)
  result.history.redo()
  expect(result.value()).toBe(changed)
})

it('should pass function snapshots to the change callback without invoking them', () => {
  const initial = vi.fn(() => 'initial')
  const changed = vi.fn(() => 'changed')
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal(initial)
    const history = useUndoHistory({
      onChange: (snapshot) => setValue(() => snapshot),
      valueAccessor: value,
    })
    return {history, setValue, value}
  })

  result.history.capture()
  result.setValue(() => changed)
  result.history.undo()
  expect(result.value()).toBe(initial)
  result.history.redo()
  expect(result.value()).toBe(changed)
  expect(initial).not.toHaveBeenCalled()
  expect(changed).not.toHaveBeenCalled()
})

it('should publish each history transition and restored value in one Solid batch', () => {
  const observed = vi.fn()
  const {result} = renderHook(() => {
    const [value, setValue] = createSignal(0)
    const history = useUndoHistory({onChange: setValue, valueAccessor: value})
    createComputed(() => observed(value(), history.canUndo(), history.canRedo()))
    return {history, setValue}
  })
  result.history.capture()
  result.setValue(1)
  observed.mockClear()
  result.history.undo()
  result.history.redo()
  result.history.undo()
  result.history.capture()
  result.history.reset()
  expect(observed.mock.calls).toEqual([
    [0, false, true],
    [1, true, false],
    [0, false, true],
    [0, true, false],
    [0, false, false],
  ])
})
