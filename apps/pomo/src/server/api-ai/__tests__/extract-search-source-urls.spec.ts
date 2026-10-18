/** @vitest-environment node */
import type {ResponseFunctionWebSearch} from 'openai/resources/responses/responses'
import {expect, it} from 'vitest'
import {extractSearchSourceUrls} from '../extract-search-source-urls'

const search = (
  sources?: ResponseFunctionWebSearch.Search['sources'],
): ResponseFunctionWebSearch => ({
  action: {sources, type: 'search'},
  id: 'search',
  status: 'completed',
  type: 'web_search_call',
})

it('should preserve first-seen order and URL spelling across calls without mutating input', () => {
  const sources = [
    {type: 'url' as const, url: 'https://b.example'},
    {type: 'url' as const, url: 'https://a.example'},
    {type: 'url' as const, url: 'https://a.example/'},
  ]
  const output = Object.freeze([
    search(sources),
    search([
      {type: 'url', url: 'https://b.example'},
      {type: 'url', url: 'HTTPS://a.example'},
    ]),
  ])
  const original = structuredClone(output)
  sources.forEach(Object.freeze)
  Object.freeze(sources)
  expect(extractSearchSourceUrls(output)).toEqual([
    'https://b.example',
    'https://a.example',
    'https://a.example/',
    'HTTPS://a.example',
  ])
  expect(output).toEqual(original)
})

it('should ignore non-search actions and accept missing sources or empty output', () => {
  expect(
    extractSearchSourceUrls([
      search(),
      {
        action: {type: 'open_page', url: 'https://ignored.example'},
        id: 'open',
        status: 'completed',
        type: 'web_search_call',
      },
      {
        action: {pattern: 'text', type: 'find_in_page', url: 'https://ignored.example'},
        id: 'find',
        status: 'completed',
        type: 'web_search_call',
      },
    ]),
  ).toEqual([])
  expect(extractSearchSourceUrls([])).toEqual([])
})

it('should retain action and source getter order without extra reads', () => {
  const trace: string[] = []
  const item = search()
  Object.defineProperty(item, 'action', {
    get: () => {
      trace.push('action')
      return {
        get sources() {
          trace.push('sources')
          return [
            {
              type: 'url',
              get url() {
                trace.push('url')
                return 'https://a.example'
              },
            },
          ]
        },
        get type() {
          trace.push('type')
          return 'search'
        },
      }
    },
  })
  expect(extractSearchSourceUrls([item])).toEqual(['https://a.example'])
  expect(trace).toEqual(['action', 'type', 'action', 'sources', 'url'])
})

it('should propagate source getter failures unchanged', () => {
  const error = new Error('source unavailable')
  const item = search([
    {
      type: 'url',
      get url(): string {
        throw error
      },
    },
  ])
  let caught: unknown
  try {
    extractSearchSourceUrls([item])
  } catch (cause) {
    caught = cause
  }
  expect(caught).toBe(error)
})
