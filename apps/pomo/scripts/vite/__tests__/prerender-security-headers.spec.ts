import {createHash} from 'node:crypto'

import {describe, expect, it} from 'vitest'

import {createInlineContentHashes} from '../prerender-security-headers'

const createHashSource = (content: string): string =>
  `sha256-${createHash('sha256').update(content).digest('base64')}`

describe('createInlineContentHashes', () => {
  it('should hash nonce-marked inline elements without hashing external or unmarked scripts', () => {
    const firstScript = 'window.first = true'
    const secondScript = 'window.second = true'
    const emptyNonceValueScript = 'window.emptyNonceValue = true'
    const unmarkedScript = 'window.unmarked = true'
    const style = 'body { color: white; }'
    const html = [
      `<style nonce="build-nonce">${style}</style>`,
      `<script nonce="build-nonce">${firstScript}</script>`,
      `<script nonce="build-nonce">${firstScript}</script>`,
      '<script nonce="build-nonce" src="/entry.js"></script>',
      `<script data-src="deferred" nonce="build-nonce">${secondScript}</script>`,
      `<script nonce="">${emptyNonceValueScript}</script>`,
      `<script>${unmarkedScript}</script>`,
      '<script nonce>window.booleanNonce = true</script>',
      '<script data-value="nonce=not-an-attribute">window.attributeValue = true</script>',
    ].join('')

    expect(createInlineContentHashes(html)).toEqual({
      scriptHashes: [
        createHashSource(firstScript),
        createHashSource(secondScript),
        createHashSource(emptyNonceValueScript),
      ],
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

  it('should read HTML tag boundaries without treating quoted characters as markup', () => {
    const script = 'window.boundary = "</not-script>"'
    const style = 'body::before { content: ">"; }'
    const html = [
      `<SCRIPT data-value=">" NONCE="build-nonce">${script}</SCRIPT >`,
      `<style data-value='>' nonce="build-nonce">${style}</style\n>`,
      `<!-- <script nonce="build-nonce">window.commented = true</script> -->`,
    ].join('')

    expect(createInlineContentHashes(html)).toEqual({
      scriptHashes: [createHashSource(script)],
      styleHashes: [createHashSource(style)],
    })
  })

  it.each([
    {attributes: 'nonce="build" data-value="other"', marked: true},
    {attributes: 'data-value="other" nonce="build"', marked: true},
    {attributes: "NoNcE \n=\t'build' disabled", marked: true},
    {attributes: 'nonce = "" data-value="other"', marked: true},
    {attributes: 'nonce=build data-value=other', marked: true},
    {attributes: 'nonce="build" nonce disabled=other', marked: true},
    {attributes: 'nonce nonce="build" data-value="other"', marked: true},
    {attributes: 'nonce data-value="other"', marked: false},
    {attributes: 'data-nonce="build" nonce-like="build"', marked: false},
  ])('should preserve nonce marking across $attributes', ({attributes, marked}) => {
    const script = 'window.marked = "한글"'
    const style = 'body { color: white; }'

    expect(
      createInlineContentHashes(
        `<script ${attributes}>${script}</script><style ${attributes}>${style}</style>`,
      ),
    ).toEqual({
      scriptHashes: marked ? [createHashSource(script)] : [],
      styleHashes: marked ? [createHashSource(style)] : [],
    })
  })

  it('should reset attribute tracking between marked and boolean-nonce siblings', () => {
    const marked = 'window.marked = true'
    const unmarked = 'window.unmarked = true'
    const html = [
      `<script nonce="build" data-value="other">${marked}</script>`,
      `<script nonce data-value="other">${unmarked}</script>`,
      `<style data-value="other" nonce>body { color: red; }</style>`,
    ].join('')

    expect(createInlineContentHashes(html)).toEqual({
      scriptHashes: [createHashSource(marked)],
      styleHashes: [],
    })
  })
})
