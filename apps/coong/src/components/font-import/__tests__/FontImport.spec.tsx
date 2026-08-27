/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {FontImport} from '../FontImport'
import {fontImport} from '../font-import'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FontImport', () => {
  it('should schedule font loading through the idle callback once', () => {
    const requestIdleCallback = vi.fn()
    vi.stubGlobal('requestIdleCallback', requestIdleCallback)

    render(() => (
      <>
        <FontImport />
        <FontImport />
      </>
    ))

    expect(requestIdleCallback).toHaveBeenCalledOnce()
  })
})

describe('fontImport', () => {
  it('should reuse the in-flight font stylesheet import', () => {
    const first = fontImport()
    const second = fontImport()

    expect(second).toBe(first)
    return expect(first).resolves.toBeDefined()
  })
})
