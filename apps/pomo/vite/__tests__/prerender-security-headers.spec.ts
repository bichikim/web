import {createHash} from 'node:crypto'

import {describe, expect, it} from 'vitest'

import {createInlineContentHashes} from '../prerender-security-headers'

const createHashSource = (content: string): string =>
  `sha256-${createHash('sha256').update(content).digest('base64')}`

describe('createInlineContentHashes', () => {
  it('should hash inline scripts and styles without hashing external scripts', () => {
    const firstScript = 'window.first = true'
    const secondScript = 'window.second = true'
    const style = 'body { color: white; }'
    const html = [
      `<style nonce="build-nonce">${style}</style>`,
      `<script nonce="build-nonce">${firstScript}</script>`,
      `<script nonce="build-nonce">${firstScript}</script>`,
      '<script src="/entry.js"></script>',
      `<script type="module">${secondScript}</script>`,
    ].join('')

    expect(createInlineContentHashes(html)).toEqual({
      scriptHashes: [createHashSource(firstScript), createHashSource(secondScript)],
      styleHashes: [createHashSource(style)],
    })
  })

  it('should return empty hash collections when the document has no inline elements', () => {
    expect(createInlineContentHashes('<script src="/entry.js"></script>')).toEqual({
      scriptHashes: [],
      styleHashes: [],
    })
  })
})
