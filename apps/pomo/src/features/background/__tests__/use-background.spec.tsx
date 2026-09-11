/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'
import {reportClientError} from 'src/features/client-error-reporter'
import {type BackgroundRepository, type BackgroundSnapshot, DEFAULT_BACKGROUND} from '../model'
import {getBackgroundRepository} from '../repository'
import {useBackground} from '../use-background'

vi.mock('../repository', () => ({getBackgroundRepository: vi.fn()}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: vi.fn()}))

let snapshot: BackgroundSnapshot
let repository: BackgroundRepository
beforeEach(() => {
  vi.clearAllMocks()
  snapshot = {items: [], preferences: DEFAULT_BACKGROUND}
  repository = {
    add: vi.fn(),
    configure: vi.fn(async (patch) => {
      snapshot = {...snapshot, preferences: {...snapshot.preferences, ...patch}}
    }),
    load: vi.fn(),
    read: vi.fn(async () => snapshot),
    remove: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
  vi.mocked(getBackgroundRepository).mockResolvedValue(repository)
})

it('should restore persisted mode and unsubscribe on disposal', async () => {
  snapshot = {...snapshot, preferences: {...DEFAULT_BACKGROUND, mode: 'frame', order: 'random'}}
  const unsubscribe = vi.fn()
  vi.mocked(repository.subscribe).mockReturnValue(unsubscribe)
  const {result, cleanup} = renderHook(useBackground)
  expect(result.ready()).toBe(false)
  await waitFor(() => expect(result.ready()).toBe(true))
  expect(result.preferences()).toMatchObject({mode: 'frame', order: 'random'})
  cleanup()
  expect(unsubscribe).toHaveBeenCalledOnce()
})

it('should keep the persisted mode when a save fails and permit retry', async () => {
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  vi.mocked(repository.configure).mockRejectedValueOnce(new Error('quota'))
  await result.configure({mode: 'frame'})
  expect(result.preferences().mode).toBe('character')
  expect(result.error()).toBe('save')
  expect(reportClientError).toHaveBeenCalled()
  await result.configure({mode: 'frame'})
  expect(result.preferences().mode).toBe('frame')
  cleanup()
})

it('should reject empty and unsupported files and continue after one storage failure', async () => {
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  vi.mocked(repository.add).mockRejectedValueOnce(new Error('quota')).mockResolvedValueOnce()
  await result.add([
    new File([], 'empty.png', {type: 'image/png'}),
    new File(['text'], 'file.txt', {type: 'text/plain'}),
    new File(['a'], 'first.png', {type: 'image/png'}),
    new File(['b'], 'second.mp4', {type: 'video/mp4'}),
  ])
  expect(repository.add).toHaveBeenCalledTimes(2)
  expect(repository.add).toHaveBeenLastCalledWith(
    expect.objectContaining({name: 'second.mp4'}),
    'video',
  )
  expect(result.error()).toBe('save')
  expect(result.busy()).toBe(false)
  cleanup()
})

it('should serialize rapid setting changes without dropping the last selection', async () => {
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  await Promise.all([
    result.configure({mode: 'frame'}),
    result.configure({order: 'random'}),
    result.configure({photoSeconds: 30}),
  ])
  expect(result.preferences()).toEqual({
    ...DEFAULT_BACKGROUND,
    mode: 'frame',
    order: 'random',
    photoSeconds: 30,
  })
  expect(repository.configure).toHaveBeenCalledTimes(3)
  expect(result.busy()).toBe(false)
  cleanup()
})

it('should reject oversized media before storage while accepting files at each limit', async () => {
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  const createFile = (name: string, type: string, size: number) => {
    const file = new File(['media'], name, {type})
    Object.defineProperty(file, 'size', {value: size})
    return file
  }
  const photo = createFile('photo.png', 'image/png', 3_000_000)
  const video = createFile('video.mp4', 'video/mp4', 30_000_000)
  await result.add([
    createFile('large.png', 'image/png', 3_000_001),
    photo,
    createFile('large.mp4', 'video/mp4', 30_000_001),
    video,
  ])
  expect(repository.add).toHaveBeenCalledTimes(2)
  expect(repository.add).toHaveBeenCalledWith(photo, 'photo')
  expect(repository.add).toHaveBeenCalledWith(video, 'video')
  expect(result.error()).toBe('size')
  expect(reportClientError).not.toHaveBeenCalled()
  cleanup()
})

it('should retain unchanged media identities across setting refreshes and update changed entries', async () => {
  snapshot = {...snapshot, items: [{id: 'a', kind: 'photo', name: 'a.png', size: 10}]}
  vi.mocked(repository.read).mockImplementation(async () => structuredClone(snapshot))
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  const original = result.items()
  await result.configure({order: 'random'})
  await result.configure({photoSeconds: 30})
  expect(result.items()).toBe(original)
  snapshot = {
    ...snapshot,
    items: [...snapshot.items, {id: 'b', kind: 'photo', name: 'b.png', size: 20}],
  }
  await result.retry()
  expect(result.items()[0]).toBe(original[0])
  expect(result.items()).toHaveLength(2)
  snapshot = {...snapshot, items: [{...snapshot.items[0]!, name: 'renamed.png'}]}
  await result.retry()
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]?.name).toBe('renamed.png')
  expect(result.items()[0]).not.toBe(original[0])
  cleanup()
})

it('should not disable media controls while saving preferences', async () => {
  let finish!: () => void
  vi.mocked(repository.configure).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  const saving = result.configure({order: 'random'})
  await waitFor(() => expect(repository.configure).toHaveBeenCalled())
  expect(result.busy()).toBe(false)
  finish()
  await saving
  expect(result.busy()).toBe(false)
  cleanup()
})

it('should keep media busy through queued settings and clear it when media completes', async () => {
  let finish!: () => void
  vi.mocked(repository.add).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {result, cleanup} = renderHook(useBackground)
  await waitFor(() => expect(result.ready()).toBe(true))
  const adding = result.add([new File(['a'], 'a.png', {type: 'image/png'})])
  const saving = result.configure({photoSeconds: 30})
  await waitFor(() => expect(repository.add).toHaveBeenCalled())
  expect(result.busy()).toBe(true)
  finish()
  await Promise.all([adding, saving])
  expect(result.busy()).toBe(false)
  cleanup()
})
