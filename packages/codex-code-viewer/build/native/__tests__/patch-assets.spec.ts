import {describe, expect, it} from 'vitest'
import {NATIVE_BUILD, patchAssets} from '../patch-assets'

describe('patchAssets', () => {
  it('should reject unsupported builds without generating modified assets', () => {
    expect(() => patchAssets({helper: '', sources: new Map(), version: 'future-version'})).toThrow(
      'Unsupported Codex build',
    )
  })
  it('should reject missing or changed original assets', () => {
    expect(() => patchAssets({helper: '', sources: new Map(), version: NATIVE_BUILD})).toThrow(
      'checksum',
    )
    expect(() =>
      patchAssets({
        helper: '',
        sources: new Map([['app-initial-69cd8dbddec5.js', 'modified']]),
        version: NATIVE_BUILD,
      }),
    ).toThrow('checksum')
  })
})
