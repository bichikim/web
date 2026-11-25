import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {createFeedConnectionRepository, FEED_CONNECTIONS_STORAGE_KEY} from '../repository'
import {useFeedConnections} from '../use-feed-connections'

afterEach(() => {
  cleanup()
  localStorage.removeItem(FEED_CONNECTIONS_STORAGE_KEY)
})

it('should react to another document and preserve its latest feed when editing', async () => {
  const {result} = renderHook(useFeedConnections)
  const frame = document.createElement('iframe')
  document.body.append(frame)
  try {
    const otherStorage = frame.contentWindow!.localStorage
    const other = createFeedConnectionRepository(otherStorage)
    const date = new Date().toISOString()
    const external = {
      createdAt: date,
      id: 'other-feed',
      updatedAt: date,
      url: 'https://other.example.test/feed',
      version: 1,
      voiceId: 'default',
    } as const
    other.save([external])
    await expect.poll(result.connections).toEqual([external])

    expect(result.onAddRecommendation('https://new.example.test/feed')).toBe(true)
    expect(other.list().map((connection) => connection.url)).toEqual([
      external.url,
      'https://new.example.test/feed',
    ])
  } finally {
    frame.remove()
  }
})
