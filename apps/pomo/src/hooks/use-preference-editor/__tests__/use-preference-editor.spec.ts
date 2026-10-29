/** @vitest-environment jsdom */
import {cleanup, renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, expectTypeOf, it, vi} from 'vitest'
import {createDeferred} from 'src/__tests__/create-deferred'
import {PreferenceProvider, usePreference} from 'src/hooks/use-preference'
import {usePreferenceEditor, type UsePreferenceEditorProps} from '..'

const createEditor = () => {
  const read = vi.fn().mockReturnValue(10)
  const write = vi.fn().mockReturnValue(null)
  const reportError = vi.fn()
  const messages = {
    loadFailed: vi.fn(() => 'load failed'),
    notReady: vi.fn(() => 'not ready'),
    saved: vi.fn((): string | null => 'saved'),
    saveFailed: vi.fn(() => 'save failed'),
  }
  const unsubscribe = vi.fn()
  let notify: (key: string | null) => void = () => undefined
  const subscribe = vi.fn((listener: typeof notify) => {
    notify = listener
    return unsubscribe
  })
  const props: UsePreferenceEditorProps<number> = {
    equal: (left, right) => left === right,
    messages,
    preference: {
      defaultValue: 10,
      key: 'editor',
      parse: (value) => (typeof value === 'number' ? value : null),
      storage: {read, subscribe, write},
    },
    reportError,
  }
  const mount = () => renderHook(() => usePreferenceEditor(props), {wrapper: PreferenceProvider})
  return {
    messages,
    mount,
    notify: () => notify('editor'),
    props,
    read,
    reportError,
    unsubscribe,
    write,
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should block saves until loading completes and keep existing feedback during a later save', async () => {
  const loading = createDeferred<number>()
  const saving = createDeferred<unknown>()
  const fixture = createEditor()
  fixture.read.mockReturnValue(loading.promise)
  fixture.write.mockReturnValue(saving.promise)
  const {result} = fixture.mount()
  expectTypeOf(result.settings()).toEqualTypeOf<number>()
  // @ts-expect-error Null is reserved for loading and queue sentinels.
  expectTypeOf(usePreferenceEditor<null>).toBeFunction()
  // @ts-expect-error Undefined is reserved for missing queued values.
  expectTypeOf(usePreferenceEditor<undefined>).toBeFunction()
  expect(result.isLoading()).toBe(true)
  expect(result.settings()).toBe(10)
  result.save(20)
  expect(fixture.write).not.toHaveBeenCalled()
  expect(result.message()).toBe('not ready')
  loading.resolve(11)
  await waitFor(() => expect(result.isLoading()).toBe(false))
  result.save(20)
  expect(result.settings()).toBe(20)
  expect(result.message()).toBe('not ready')
  saving.resolve(null)
  await waitFor(() => expect(result.message()).toBe('saved'))
})

it('should acknowledge synchronous saves and preserve zero', () => {
  const fixture = createEditor()
  const {result} = fixture.mount()
  result.save(0)
  expect(fixture.write).toHaveBeenCalledExactlyOnceWith('editor', 0)
  expect(result.settings()).toBe(0)
  expect(result.message()).toBe('saved')
})

it('should retain a reentrant pending save started by synchronous completion feedback', async () => {
  const saving = createDeferred<unknown>()
  const fixture = createEditor()
  fixture.write.mockReturnValueOnce(null).mockReturnValueOnce(saving.promise)
  const {result} = fixture.mount()
  fixture.messages.saved.mockImplementationOnce(() => {
    result.save(30)
    return 'saved'
  })
  result.save(20)
  expect(fixture.write).toHaveBeenCalledTimes(2)
  expect(result.settings()).toBe(30)
  const failure = new Error('reentrant save failed')
  saving.reject(failure)
  await waitFor(() => expect(result.message()).toBe('save failed'))
  expect(result.settings()).toBe(20)
  expect(fixture.reportError).toHaveBeenCalledExactlyOnceWith(failure, 'save')
})

it('should report a synchronous failure before formatting feedback and retry after rollback', () => {
  const failure = new Error('quota')
  const fixture = createEditor()
  const events: string[] = []
  fixture.reportError.mockImplementation(() => events.push('report'))
  fixture.messages.saveFailed.mockImplementation(() => {
    events.push('format')
    return 'save failed'
  })
  fixture.write.mockReturnValueOnce(failure)
  const {result} = fixture.mount()
  result.save(20)
  expect(events).toEqual(['report', 'format'])
  expect(fixture.reportError).toHaveBeenCalledExactlyOnceWith(failure, 'save')
  expect(result.settings()).toBe(10)
  expect(result.message()).toBe('save failed')
  result.save(20)
  expect(result.settings()).toBe(20)
  expect(result.message()).toBe('saved')
})

it.each([
  {firstSucceeds: true, secondSucceeds: true},
  {firstSucceeds: false, secondSucceeds: true},
  {firstSucceeds: true, secondSucceeds: false},
  {firstSucceeds: false, secondSucceeds: false},
])(
  'should preserve ordered settlement ($firstSucceeds/$secondSucceeds)',
  async ({firstSucceeds, secondSucceeds}) => {
    const first = createDeferred<unknown>()
    const second = createDeferred<unknown>()
    const fixture = createEditor()
    fixture.write.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const {result} = fixture.mount()
    result.save(20)
    result.save(30)
    expect(fixture.write).toHaveBeenCalledTimes(1)
    expect(result.settings()).toBe(30)
    if (firstSucceeds) {
      first.resolve(null)
    } else {
      first.reject(new Error('first failed'))
    }
    await waitFor(() => expect(fixture.write).toHaveBeenCalledTimes(2))
    expect(result.settings()).toBe(30)
    if (secondSucceeds) {
      second.resolve(null)
    } else {
      second.reject(new Error('second failed'))
    }
    await waitFor(() => {
      expect(fixture.messages.saved).toHaveBeenCalledTimes(
        Number(firstSucceeds) + Number(secondSucceeds),
      )
      expect(fixture.reportError).toHaveBeenCalledTimes(
        Number(!firstSucceeds) + Number(!secondSucceeds),
      )
      expect(result.message()).toBe(secondSucceeds ? 'saved' : 'save failed')
    })
    expect(result.settings()).toBe(secondSucceeds ? 30 : firstSucceeds ? 20 : 10)
  },
)

it('should synchronize an external value after a failed save without replacing feedback', () => {
  const fixture = createEditor()
  fixture.write.mockReturnValueOnce(new Error('quota'))
  const {result} = fixture.mount()
  result.save(20)
  expect(result.settings()).toBe(10)
  fixture.read.mockReturnValue(40)
  fixture.notify()
  expect(result.settings()).toBe(40)
  expect(result.message()).toBe('save failed')
})

it('should keep the committed overlay when an external read repeats a failed optimistic value', async () => {
  const saving = createDeferred<unknown>()
  const fixture = createEditor()
  fixture.read.mockReturnValue({value: 10})
  fixture.write.mockReturnValue(saving.promise)
  const {result} = renderHook(
    () =>
      usePreferenceEditor<{readonly value: number}>({
        ...fixture.props,
        equal: (left, right) => left.value === right.value,
        preference: {
          ...fixture.props.preference,
          defaultValue: {value: 10},
          parse: (value) =>
            typeof value === 'object' &&
            value !== null &&
            'value' in value &&
            typeof value.value === 'number'
              ? {value: value.value}
              : null,
        },
      }),
    {wrapper: PreferenceProvider},
  )
  result.save({value: 20})
  fixture.read.mockReturnValue({value: 20})
  fixture.notify()
  saving.reject(new Error('quota'))
  await waitFor(() => expect(fixture.read).toHaveBeenCalledTimes(2))
  expect(result.settings()).toEqual({value: 10})
  expect(result.message()).toBe('save failed')
  fixture.read.mockReturnValue({value: 40})
  fixture.notify()
  await waitFor(() => expect(result.settings()).toEqual({value: 40}))
})

it('should accept another consumer write without acknowledging a local save', () => {
  const fixture = createEditor()
  const {result} = renderHook(
    () => {
      const editor = usePreferenceEditor(fixture.props)
      const [, save] = usePreference(fixture.props.preference)
      return {editor, save}
    },
    {wrapper: PreferenceProvider},
  )
  result.save(20)
  expect(result.editor.settings()).toBe(20)
  expect(result.editor.message()).toBeNull()
  expect(fixture.messages.saved).not.toHaveBeenCalled()
})

it('should report a load failure and then allow a successful save from defaults', async () => {
  const failure = new Error('read unavailable')
  const fixture = createEditor()
  fixture.read.mockRejectedValue(failure)
  const {result} = fixture.mount()
  await waitFor(() => expect(result.isLoading()).toBe(false))
  expect(fixture.reportError).toHaveBeenCalledExactlyOnceWith(failure, 'load')
  expect(result.message()).toBe('load failed')
  result.save(20)
  expect(result.settings()).toBe(20)
  expect(result.message()).toBe('saved')
})

it('should allow successful saves to clear feedback silently', () => {
  const fixture = createEditor()
  fixture.write.mockReturnValueOnce(new Error('quota'))
  fixture.messages.saved.mockReturnValue(null)
  const {result} = fixture.mount()
  result.save(20)
  expect(result.message()).toBe('save failed')
  result.save(20)
  expect(result.message()).toBeNull()
})

it('should release subscriptions and ignore late load failures after disposal', async () => {
  const loading = createDeferred<number>()
  const fixture = createEditor()
  fixture.read.mockReturnValue(loading.promise)
  const {cleanup: dispose} = fixture.mount()
  dispose()
  loading.reject(new Error('late read'))
  await Promise.resolve()
  await Promise.resolve()
  expect(fixture.unsubscribe).toHaveBeenCalledOnce()
  expect(fixture.reportError).not.toHaveBeenCalled()
})

it('should ignore late successful save feedback after disposal', async () => {
  const saving = createDeferred<unknown>()
  const fixture = createEditor()
  fixture.write.mockReturnValue(saving.promise)
  const {result, cleanup: dispose} = fixture.mount()
  result.save(20)
  dispose()
  saving.resolve(null)
  await Promise.resolve()
  await Promise.resolve()
  expect(fixture.messages.saved).not.toHaveBeenCalled()
})
