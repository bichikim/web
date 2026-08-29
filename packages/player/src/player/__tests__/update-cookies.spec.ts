import {setCookieItem} from '@winter-love/utils'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {updateCookies} from '../update-cookies'

vi.mock('@winter-love/utils', () => ({setCookieItem: vi.fn()}))

describe('updateCookies', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should skip an absent cookie string', () => {
    updateCookies()

    expect(setCookieItem).not.toHaveBeenCalled()
  })

  it('should write every parsed cookie with cross-site support', () => {
    updateCookies('token=abc==; empty=')

    expect(setCookieItem).toHaveBeenNthCalledWith(1, 'token', 'abc==', {}, true)
    expect(setCookieItem).toHaveBeenNthCalledWith(2, 'empty', '', {}, true)
  })
})
