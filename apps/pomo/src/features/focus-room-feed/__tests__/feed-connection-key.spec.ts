import {expect, it} from 'vitest'

import {getFeedConnectionKey} from '..'

const environment = {
  localOrigin: 'http://localhost:3300',
  publicOrigin: 'https://www.pomofi.io',
  timeZone: 'Asia/Seoul',
}

it.each(['rss', 'atom'])('should match local and public today-in-history %s feeds', (format) => {
  const path = `/api/feeds/today-in-history/${format}.xml`
  const localUrl = new URL(path, environment.localOrigin).href
  const publicUrl = new URL(path, environment.publicOrigin).href

  expect(getFeedConnectionKey(localUrl, environment)).toBe(
    getFeedConnectionKey(publicUrl, environment),
  )
})

it('should keep development feed origins distinct', () => {
  const path = '/__dev/feeds/rss.xml'
  const localUrl = new URL(path, environment.localOrigin).href
  const publicUrl = new URL(path, environment.publicOrigin).href

  expect(getFeedConnectionKey(localUrl, environment)).not.toBe(
    getFeedConnectionKey(publicUrl, environment),
  )
})

it('should preserve external feed origins', () => {
  const localUrl = new URL('/api/feeds/today-in-history/rss.xml', environment.localOrigin).href
  const externalUrl = 'https://feeds.example.test/api/feeds/today-in-history/rss.xml'

  expect(getFeedConnectionKey(localUrl, environment)).not.toBe(
    getFeedConnectionKey(externalUrl, environment),
  )
})
