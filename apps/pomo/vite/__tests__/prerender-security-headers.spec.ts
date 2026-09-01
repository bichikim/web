import {createHash} from 'node:crypto'

import {describe, expect, it} from 'vitest'

import {createInlineContentHashes} from '../prerender-security-headers'

const createHashSource = (content: string): string =>
  `sha256-${createHash('sha256').update(content).digest('base64')}`

describe('createInlineContentHashes', () => {
  it('should hash nonce-marked inline elements without hashing external or unmarked scripts', () => {
    const firstScript = 'window.first = true'
    const secondScript = 'window.second = true'
    const unmarkedScript = 'window.unmarked = true'
    const style = 'body { color: white; }'
    const html = [
      `<style nonce="build-nonce">${style}</style>`,
      `<script nonce="build-nonce">${firstScript}</script>`,
      `<script nonce="build-nonce">${firstScript}</script>`,
      '<script nonce="build-nonce" src="/entry.js"></script>',
      `<script data-src="deferred" nonce="build-nonce">${secondScript}</script>`,
      `<script>${unmarkedScript}</script>`,
    ].join('')

    expect(createInlineContentHashes(html)).toEqual({
      scriptHashes: [createHashSource(firstScript), createHashSource(secondScript)],
      styleHashes: [createHashSource(style)],
    })
  })

  it('should return empty hash collections when the document has no nonce-marked content', () => {
    const html = '<script nonce="build-nonce" src="/entry.js"></script><script>inline</script>'

    expect(createInlineContentHashes(html)).toEqual({
      scriptHashes: [],
      styleHashes: [],
    })
  })
})
