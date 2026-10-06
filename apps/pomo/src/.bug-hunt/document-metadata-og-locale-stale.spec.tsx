/** @vitest-environment jsdom */

import {MetaProvider} from '@solidjs/meta'
import {getLocale, setLocale} from '@paraglide/runtime'
import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PDocumentMetadata} from '../components/p-document-metadata/PDocumentMetadata'

vi.mock('@solidjs/router', () => ({
  useLocation: () => ({pathname: '/', search: ''}),
}))

describe('PDocumentMetadata locale integration', () => {
  let previousRuntimeLocale: ReturnType<typeof getLocale>

  beforeEach(() => {
    previousRuntimeLocale = getLocale()
  })

  afterEach(async () => {
    await setLocale(previousRuntimeLocale, {reload: false})
  })

  it('should refresh og:locale when the UI locale changes without reload', async () => {
    await setLocale('ko', {reload: false})
    render(() => (
      <MetaProvider>
        <PDocumentMetadata />
      </MetaProvider>
    ))

    await setLocale('en', {reload: false})

    const localeMeta = document.head.querySelector('meta[property="og:locale"]')
    expect(localeMeta?.getAttribute('content')).toBe('en_US')
  })
})
