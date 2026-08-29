import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createRepository: vi.fn()}))

vi.mock('../repository', () => ({createFeedConnectionRepository: mocks.createRepository}))

import {
  type FeedConnectionController,
  FEED_CONNECTIONS_CHANGED_EVENT,
  useFeedConnections,
} from '../use-feed-connections'
import type {FeedConnection} from '../schema'

const STORED_CONNECTION = {
  createdAt: '2026-08-26T00:00:00.000Z',
  id: 'stored',
  updatedAt: '2026-08-26T00:00:00.000Z',
  url: 'https://stored.example.test/feed',
  version: 1,
  voiceId: 'default',
} as const satisfies FeedConnection

const mountController = (beforeMount?: (controller: FeedConnectionController) => void) => {
  let controller!: FeedConnectionController
  const result = render(() => {
    controller = useFeedConnections()
    beforeMount?.(controller)
    return document.createElement('span')
  })
  return {controller, unmount: result.unmount}
}

beforeEach(() => {
  let id = 0
  vi.stubGlobal('crypto', {randomUUID: vi.fn(() => `new-id-${(id += 1)}`)})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should add, deduplicate, update, and delete persistent feed connections', async () => {
  const save = vi.fn()
  const persist = vi.fn(async () => true)
  Object.defineProperty(navigator, 'storage', {configurable: true, value: {persist}})
  mocks.createRepository.mockReturnValue({list: () => [], save})
  const changed = vi.fn()
  window.addEventListener(FEED_CONNECTIONS_CHANGED_EVENT, changed)
  const {controller, unmount} = mountController()

  expect(controller.isLoading()).toBe(false)
  controller.onDraftUrlChange('invalid')
  controller.onAdd()
  expect(controller.message()).toContain('HTTP')
  controller.onDraftUrlChange('https://example.test/feed#fragment')
  controller.onAdd()
  expect(controller.draftUrl()).toBe('')
  expect(controller.connections()).toHaveLength(1)
  expect(persist).toHaveBeenCalledOnce()
  expect(changed).toHaveBeenCalledOnce()

  expect(controller.onAddRecommendation('https://example.test/feed')).toBe(false)
  expect(controller.message()).toContain('이미')
  expect(controller.onAddRecommendation('https://second.example.test/feed')).toBe(true)
  controller.onVoiceChange('new-id-1', 'Yuna')
  expect(controller.connections()[0]?.voiceId).toBe('Yuna')
  controller.onVoiceChange('missing', 'Hana')
  controller.onDelete('missing')
  controller.onDelete('new-id-1')
  expect(controller.connections()).toHaveLength(1)
  expect(save).toHaveBeenCalledTimes(6)
  unmount()
  window.removeEventListener(FEED_CONNECTIONS_CHANGED_EVENT, changed)
})

it('should report repository initialization and save failures', () => {
  const loadError = new Error('load failed')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.createRepository.mockImplementationOnce(() => {
    throw loadError
  })
  const failedLoad = mountController()
  expect(failedLoad.controller.message()).toContain('불러오지')
  failedLoad.unmount()

  mocks.createRepository.mockReturnValue({
    list: () => [STORED_CONNECTION],
    save: () => {
      throw new Error('save failed')
    },
  })
  const failedSave = mountController()
  failedSave.controller.onDelete('stored')
  failedSave.controller.onVoiceChange('stored', 'Yuna')
  expect(failedSave.controller.message()).toContain('저장하지')
  failedSave.unmount()
})

it('should reject writes before mount and tolerate unavailable or rejected persistence', async () => {
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  mocks.createRepository.mockReturnValue({list: () => [], save: vi.fn()})
  const beforeMount = mountController((controller) => {
    expect(controller.onAddRecommendation('https://early.example.test/feed')).toBe(false)
  })
  expect(beforeMount.controller.message()).toContain('준비되지')
  beforeMount.unmount()

  Object.defineProperty(navigator, 'storage', {configurable: true, value: undefined})
  const unavailable = mountController()
  unavailable.controller.onAddRecommendation('https://unavailable.example.test/feed')
  unavailable.unmount()

  const failure = new Error('persist failed')
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {persist: vi.fn(async () => Promise.reject(failure))},
  })
  const rejected = mountController()
  rejected.controller.onAddRecommendation('https://rejected.example.test/feed')
  await vi.waitFor(() =>
    expect(consoleWarn).toHaveBeenCalledWith(
      'Failed to request persistent feed connection storage.',
      failure,
    ),
  )
  rejected.unmount()
})
