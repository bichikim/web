import {beforeEach, expect, it, vi} from 'vitest'
import type {FrameRenderer} from '../../frame-renderer'
import {findCompanion} from '../companion'
import {showFrame, type ShowFrameOptions} from '../show-frame'
import type {BackgroundController} from '../use-background'

vi.mock('../companion', () => ({findCompanion: vi.fn()}))
const first = {id: 'a', kind: 'photo' as const, name: 'A', size: 10}
const second = {...first, id: 'b'}
const renderer = {
  addPhoto: vi.fn(),
  photoSize: () => ({height: 1000, width: 600}),
  present: vi.fn(),
  show: vi.fn(),
  viewportSize: () => ({height: 1000, width: 1500}),
}
let controller: AbortController
let options: ShowFrameOptions
beforeEach(() => {
  vi.clearAllMocks()
  controller = new AbortController()
  options = {
    background: {
      items: () => [first, second],
      load: vi.fn(async () => new Blob(['a'])),
      markFailed: vi.fn(),
    } as unknown as BackgroundController,
    candidates: () => ['b'],
    item: first,
    pairPhotos: true,
    renderer: renderer as unknown as FrameRenderer,
    signal: controller.signal,
    sizes: new Map(),
    transition: 'fade',
  }
  renderer.present.mockResolvedValue(true)
  renderer.show.mockResolvedValue(true)
  renderer.addPhoto.mockReturnValue(true)
})
it('should return a companion only after the renderer accepts it', async () => {
  const companion = {id: 'b', image: {} as HTMLImageElement, release: vi.fn()}
  vi.mocked(findCompanion).mockResolvedValue(companion)
  expect(await showFrame(options)).toEqual({companionId: 'b'})
  expect(companion.release).not.toHaveBeenCalled()
  renderer.addPhoto.mockReturnValue(false)
  expect(await showFrame(options)).toEqual({companionId: null})
  expect(companion.release).toHaveBeenCalledOnce()
})
it('should release a late companion after cancellation without adding it', async () => {
  const companion = {id: 'b', image: {} as HTMLImageElement, release: vi.fn()}
  vi.mocked(findCompanion).mockImplementation(async () => {
    controller.abort()
    return companion
  })
  expect(await showFrame(options)).toBeNull()
  expect(renderer.addPhoto).not.toHaveBeenCalled()
  expect(companion.release).toHaveBeenCalledOnce()
})
it('should skip companion discovery when disabled or playing a video', async () => {
  await showFrame({...options, pairPhotos: false})
  await showFrame({...options, item: {...first, kind: 'video'}})
  expect(findCompanion).not.toHaveBeenCalled()
})

it('should wait for the completed group transition before reporting the companion as shown', async () => {
  const companion = {id: 'b', image: {} as HTMLImageElement, release: vi.fn()}
  vi.mocked(findCompanion).mockResolvedValue(companion)
  let finish!: (completed: boolean) => void
  renderer.present.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve
      }),
  )
  const completed = vi.fn()
  const showing = showFrame(options).then(completed)
  await vi.waitFor(() => expect(renderer.present).toHaveBeenCalledWith('fade'))
  expect(renderer.addPhoto).toHaveBeenCalledWith(companion)
  expect(completed).not.toHaveBeenCalled()
  finish(true)
  await showing
  expect(completed).toHaveBeenCalledWith({companionId: 'b'})
})

it('should not consume a companion when the transition is canceled', async () => {
  vi.mocked(findCompanion).mockResolvedValue(null)
  renderer.present.mockResolvedValue(false)
  expect(await showFrame(options)).toBeNull()
})
