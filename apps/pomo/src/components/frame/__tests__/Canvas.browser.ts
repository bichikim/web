import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {showFrame} from 'src/features/background'
import {reportClientError} from 'src/features/client-error-reporter'
import {FrameRenderer} from 'src/features/frame-renderer'
import {Canvas} from '../Canvas'

vi.mock('src/features/background', async () => {
  const actual =
    await vi.importActual<typeof import('src/features/background')>('src/features/background')
  return {...actual, showFrame: vi.fn(actual.showFrame)}
})
vi.mock('src/features/frame-renderer', () => ({FrameRenderer: vi.fn()}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))

const renderer = {
  cancelPending: vi.fn(),
  clear: vi.fn(),
  destroy: vi.fn(),
  initialize: vi.fn(async () => undefined),
  photoSize: vi.fn(() => null),
  present: vi.fn(async () => true),
  removePhoto: vi.fn(),
  setVideoLoop: vi.fn(),
  show: vi.fn(async () => true),
}
const primary = {id: 'primary', kind: 'photo' as const, name: 'Primary', size: 1}
const replacement = {id: 'replacement', kind: 'photo' as const, name: 'Replacement', size: 1}

beforeEach(() => {
  vi.clearAllMocks()
  renderer.cancelPending.mockReset()
  renderer.present.mockReset().mockResolvedValue(true)
  vi.mocked(FrameRenderer).mockImplementation(function createRenderer() {
    return renderer as unknown as FrameRenderer
  })
})
afterEach(cleanup)

it('should ignore an aborted load rejection while the replacement presents', async () => {
  const pending = Promise.withResolvers<Blob>()
  const [items, setItems] = createSignal([primary])
  const background = {
    ...createBackground(),
    items,
    load: vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(new Blob(['image'])),
  }
  render(() => createComponent(Canvas, {background}))
  await expect.poll(() => vi.mocked(showFrame).mock.calls.length).toBe(1)
  const {signal} = vi.mocked(showFrame).mock.calls[0]![0]
  const trace: string[] = []
  signal.addEventListener('abort', () => {
    trace.push('abort')
    expect(signal.aborted).toBe(true)
    pending.reject(new Error('Interrupted load'))
  })
  renderer.cancelPending.mockImplementation(() => trace.push('cancel'))

  setItems([replacement])

  await expect.poll(() => renderer.present.mock.calls.length).toBe(1)
  await expect.element(page.getByLabelText('Replacement', {exact: true})).toBeVisible()
  expect(trace).toEqual(['abort', 'cancel'])
  expect(renderer.show).toHaveBeenCalledOnce()
  expect(background.markFailed).not.toHaveBeenCalled()
  expect(reportClientError).not.toHaveBeenCalled()
  expect(vi.mocked(showFrame).mock.calls[1]![0].signal.aborted).toBe(false)
})

it('should cancel an unmounted load before its successful completion', async () => {
  const pending = Promise.withResolvers<Blob>()
  const background = {...createBackground(), items: () => [primary], load: () => pending.promise}
  const view = render(() => createComponent(Canvas, {background}))
  await expect.poll(() => vi.mocked(showFrame).mock.calls.length).toBe(1)
  const {signal} = vi.mocked(showFrame).mock.calls[0]![0]

  view.unmount()
  pending.resolve(new Blob(['image']))
  const shown = await vi.mocked(showFrame).mock.results[0]!.value

  expect(signal.aborted).toBe(true)
  expect(shown).toBeNull()
  expect(renderer.show).not.toHaveBeenCalled()
  expect(renderer.cancelPending).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(background.markFailed).not.toHaveBeenCalled()
  expect(reportClientError).not.toHaveBeenCalled()
})

it('should ignore a presentation rejected synchronously by its abort listener', async () => {
  const pending = Promise.withResolvers<boolean>()
  renderer.present.mockReturnValueOnce(pending.promise)
  const background = {...createBackground(), items: () => [primary]}
  const view = render(() => createComponent(Canvas, {background}))
  await expect.poll(() => renderer.present.mock.calls.length).toBe(1)
  const {signal} = vi.mocked(showFrame).mock.calls[0]![0]
  signal.addEventListener('abort', () => pending.reject(new Error('Interrupted presentation')))

  view.unmount()
  await Promise.allSettled([vi.mocked(showFrame).mock.results[0]!.value])
  await Promise.resolve()

  expect(signal.aborted).toBe(true)
  expect(renderer.cancelPending).toHaveBeenCalledOnce()
  expect(renderer.destroy).toHaveBeenCalledOnce()
  expect(background.markFailed).not.toHaveBeenCalled()
  expect(reportClientError).not.toHaveBeenCalled()
})
