import {expect, it} from 'vitest'
import {getFeedRequestUrl} from '../feed-request-url'

const environment = {
  localOrigin: 'https://app.example',
  publicOrigin: 'https://www.pomofi.io',
  timeZone: 'America/New_York',
}

it.each([
  '/api/feeds/today-in-history/rss.xml',
  'https://www.pomofi.io/api/feeds/today-in-history/atom.xml',
  '/__dev/feeds/rss.xml',
  '/__dev/feeds/atom.xml?timeZone=Asia%2FSeoul',
])('should apply the supplied viewer zone to owned feeds: %s', (value) => {
  const url = new URL(getFeedRequestUrl(value, environment))
  expect(url.searchParams.getAll('timeZone')).toEqual(['America/New_York'])
})
it.each([
  '/api/feeds/today-in-history/rss.xml/',
  'https://www.pomofi.io/api/feeds/today-in-history/atom.xml/',
  '/__dev/feeds/rss.xml/',
  '/__dev/feeds/atom.xml/?timeZone=Asia%2FSeoul',
])('should apply the supplied viewer zone to owned feeds with a trailing slash: %s', (value) => {
  const url = new URL(getFeedRequestUrl(value, environment))
  expect(url.searchParams.getAll('timeZone')).toEqual(['America/New_York'])
})
it.each([
  'https://example.com/api/feeds/today-in-history/rss.xml',
  '/api/other',
  'https://example.com/rss.xml',
  'http://[invalid',
])('should preserve unrelated or invalid URLs: %s', (value) => {
  expect(getFeedRequestUrl(value, environment)).toBe(value)
})
it('should resolve a relative feed against the public origin without a browser origin', () => {
  expect(
    getFeedRequestUrl('/__dev/feeds/rss.xml', {
      publicOrigin: environment.publicOrigin,
      timeZone: 'UTC',
    }),
  ).toBe('https://www.pomofi.io/__dev/feeds/rss.xml?timeZone=UTC')
})
it('should preserve relative URLs when no origin is available', () => {
  expect(getFeedRequestUrl('/__dev/feeds/rss.xml', {timeZone: 'UTC'})).toBe('/__dev/feeds/rss.xml')
})
