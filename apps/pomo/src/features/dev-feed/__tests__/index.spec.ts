import {describe, expect, it} from 'vitest'

import {createDevFeedDocument} from '..'

const ORIGIN = 'http://localhost:3200'

describe('createDevFeedDocument', () => {
  it('should create an RSS snapshot aligned to the latest five-minute boundary', () => {
    const document = createDevFeedDocument({
      format: 'rss',
      now: new Date('2026-05-04T13:34:43.000Z'),
      origin: ORIGIN,
    })

    expect(document).toMatch(/<title>“[^”]+” — [^<]+ · 2026년 5월 4일 22시 30분<\/title>/u)
    expect(document).toContain('<pubDate>Mon, 04 May 2026 13:30:00 GMT</pubDate>')
    expect(document).toContain('href="http://localhost:3200/__dev/feeds/rss.xml"')
    expect(document.match(/<item>/gu)).toHaveLength(12)
  })

  it('should keep the item identity stable within a window and change it at the next boundary', () => {
    const firstDocument = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:09:59.000Z'),
      origin: ORIGIN,
    })
    const sameWindowDocument = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:05:01.000Z'),
      origin: ORIGIN,
    })
    const nextDocument = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:10:00.000Z'),
      origin: ORIGIN,
    })

    expect(firstDocument).toBe(sameWindowDocument)
    expect(nextDocument).not.toBe(firstDocument)
    expect(nextDocument).toMatch(/<title>“[^”]+” — [^<]+ · 2026년 8월 14일 10분<\/title>/u)
    expect(nextDocument.match(/<entry>/gu)).toHaveLength(12)
  })

  it('should omit leading and zero-valued time components', () => {
    const document = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T21:00:00.000Z'),
      origin: ORIGIN,
    })

    expect(document).toMatch(/<title>[^<]+ · 2026년 8월 14일 6시<\/title>/u)
    expect(document).not.toContain('2026년 8월 14일 06시 00분')
  })

  it('should show only the date at midnight on the hour', () => {
    const document = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:00:00.000Z'),
      origin: ORIGIN,
    })

    expect(document).toMatch(/<title>[^<]+ · 2026년 8월 14일<\/title>/u)
  })

  it('should select quotes for feed items published before the Unix epoch', () => {
    const document = createDevFeedDocument({
      format: 'rss',
      now: new Date('1970-01-01T00:00:00.000Z'),
      origin: ORIGIN,
    })

    expect(document.match(/<item>/gu)).toHaveLength(12)
    expect(document).toMatch(/<title>“[^”]+” — [^<]+ · 1970년 1월 1일 9시<\/title>/u)
  })

  it('should escape the request origin in XML output', () => {
    const document = createDevFeedDocument({
      format: 'rss',
      now: new Date('2026-08-13T15:05:00.000Z'),
      origin: 'http://localhost:3200?source=one&mode=two',
    })

    expect(document).toContain('source=one&amp;mode=two')
    expect(document).not.toContain('source=one&mode=two')
  })
})
