/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useCodeClipboard} from '../use-code-clipboard'

describe('useCodeClipboard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('should copy the selected code and announce completion', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    const onError = vi.fn()
    const onNotice = vi.fn()
    await useCodeClipboard({onError, onNotice})('one\ntwo')
    expect(writeText).toHaveBeenCalledWith('one\ntwo')
    expect(onNotice).toHaveBeenCalledWith('코드를 복사했습니다.')
    expect(onError).not.toHaveBeenCalled()
  })

  it('should report clipboard permission failures without announcing success', async () => {
    const error = new Error('clipboard denied')
    const writeText = vi.fn().mockRejectedValue(error)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    const onError = vi.fn()
    const onNotice = vi.fn()
    await useCodeClipboard({onError, onNotice})('one')
    expect(onError).toHaveBeenCalledWith(error)
    expect(onNotice).not.toHaveBeenCalled()
  })
})
