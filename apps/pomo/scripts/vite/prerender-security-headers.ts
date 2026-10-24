import {createHash} from 'node:crypto'

import {HTMLTokenizer, type TokenCallback} from 'tag-soup'

type InlineElementName = 'script' | 'style'

export interface InlineContentHashes {
  readonly scriptHashes: ReadonlyArray<string>
  readonly styleHashes: ReadonlyArray<string>
}

interface TokenState {
  activeContent: string
  activeName: InlineElementName | undefined
  attributeEndIndex: number | undefined
  attributeName: string | undefined
  hasNonceValue: boolean
  openingName: InlineElementName | undefined
  readonly scriptContents: Array<string>
  readonly styleContents: Array<string>
}

const readElementName = (
  html: string,
  startIndex: number,
  endIndex: number,
): InlineElementName | undefined => {
  const name = html.slice(startIndex, endIndex).toLowerCase()
  return name === 'script' || name === 'style' ? name : undefined
}

const finishActiveElement = (state: TokenState, name: InlineElementName | undefined): void => {
  if (state.activeName === undefined || state.activeName !== name) {
    return
  }

  if (state.activeContent.length > 0) {
    const contents = state.activeName === 'script' ? state.scriptContents : state.styleContents
    contents.push(state.activeContent)
  }
  state.activeName = undefined
  state.activeContent = ''
}

const createTokenConsumer =
  (html: string, state: TokenState): TokenCallback =>
  (token, startIndex, endIndex) => {
    switch (token) {
      case 'START_TAG_NAME': {
        state.openingName = readElementName(html, startIndex, endIndex)
        state.attributeEndIndex = undefined
        state.attributeName = undefined
        state.hasNonceValue = false
        return
      }
      case 'ATTRIBUTE_NAME': {
        state.attributeName = html.slice(startIndex, endIndex).toLowerCase()
        state.attributeEndIndex = endIndex
        return
      }
      case 'ATTRIBUTE_VALUE': {
        if (
          state.attributeName === 'nonce' &&
          state.attributeEndIndex !== undefined &&
          html.slice(state.attributeEndIndex, startIndex).includes('=')
        ) {
          state.hasNonceValue = true
        }
        return
      }
      case 'START_TAG_CLOSING': {
        if (state.openingName !== undefined && state.hasNonceValue) {
          state.activeName = state.openingName
          state.activeContent = ''
        }
        return
      }
      case 'TEXT': {
        if (state.activeName !== undefined) {
          state.activeContent += html.slice(startIndex, endIndex)
        }
        break
      }
      case 'END_TAG_NAME': {
        finishActiveElement(state, readElementName(html, startIndex, endIndex))
        break
      }
    }
  }

const readNonceMarkedContents = (html: string): TokenState => {
  const state: TokenState = {
    activeContent: '',
    activeName: undefined,
    attributeEndIndex: undefined,
    attributeName: undefined,
    hasNonceValue: false,
    openingName: undefined,
    scriptContents: [],
    styleContents: [],
  }

  HTMLTokenizer.tokenizeDocument(html, createTokenConsumer(html, state))

  return state
}

const createContentHash = (content: string): string =>
  `sha256-${createHash('sha256').update(content).digest('base64')}`

const createHashes = (contents: ReadonlyArray<string>): ReadonlyArray<string> => [
  ...new Set(contents.map(createContentHash)),
]

export const createInlineContentHashes = (html: string): InlineContentHashes => {
  const contents = readNonceMarkedContents(html)
  return {
    scriptHashes: createHashes(contents.scriptContents),
    styleHashes: createHashes(contents.styleContents),
  }
}
