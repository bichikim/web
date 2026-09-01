import {createHash} from 'node:crypto'

const INLINE_SCRIPT_PATTERN = /<script\b(?<attributes>[^>]*)>(?<content>[\s\S]*?)<\/script>/giu
const INLINE_STYLE_PATTERN = /<style\b(?<attributes>[^>]*)>(?<content>[\s\S]*?)<\/style>/giu
const CSP_NONCE_ATTRIBUTE_PATTERN = /(?:^|\s)nonce\s*=/iu

export interface InlineContentHashes {
  readonly scriptHashes: ReadonlyArray<string>
  readonly styleHashes: ReadonlyArray<string>
}

const createContentHash = (content: string): string =>
  `sha256-${createHash('sha256').update(content).digest('base64')}`

const createHashes = (html: string, pattern: RegExp): ReadonlyArray<string> => [
  ...new Set(
    [...html.matchAll(pattern)]
      .filter(
        (match) =>
          match.groups!.content.length > 0 &&
          CSP_NONCE_ATTRIBUTE_PATTERN.test(match.groups!.attributes),
      )
      .map((match) => createContentHash(match.groups!.content)),
  ),
]

export const createInlineContentHashes = (html: string): InlineContentHashes => ({
  scriptHashes: createHashes(html, INLINE_SCRIPT_PATTERN),
  styleHashes: createHashes(html, INLINE_STYLE_PATTERN),
})
