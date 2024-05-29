/**
 * @jest-environment jsdom
 */
import {mountComposition} from '@winter-love/test-utils'
import {getWindow} from '@winter-love/utils'
import {getCurrentInstance} from 'vue'
import {useInstanceId} from '../'
import {describe, it, expect, vi, afterEach} from 'vitest'
vi.mock('@winter-love/utils', async () => {
  const actual: any = await vi.importActual('@winter-love/utils')
  return {
    ...actual,
    getWindow: vi.fn(actual.getWindow),
  }
})

vi.mock('vue', async () => {
  const actual: any = await vi.importActual('vue')
  return {
    ...actual,
    getCurrentInstance: vi.fn(actual.getCurrentInstance),
  }
})

const _isSSR = vi.mocked(getWindow)
const _getCurrentInstance = vi.mocked(getCurrentInstance)

describe('useInstanceId', () => {
  afterEach(() => {
    _isSSR.mockClear()
    vi.spyOn(console, 'warn').mockClear()
  })
  it('should return id', async () => {
    const wrapper = mountComposition(() => {
      const id = useInstanceId()

      return {
        id,
      }
    })

    expect(typeof wrapper.setupState.id).toBe('number')
  })

  it('should warn in ssr environment', async () => {
    ;(_isSSR as any).mockReturnValueOnce()
    vi.spyOn(console, 'warn')
    // stop console run once
    vi.mocked(console.warn).mockImplementationOnce(() => {
      // empty
    })
    const wrapper = mountComposition(() => {
      const id = useInstanceId()

      return {
        id,
      }
    })
    expect(typeof wrapper.setupState.id).toBe('number')
    expect(console.warn).toHaveBeenCalledWith('Do not use in SSR environment')
  })
  it('should warn id not in an instance', async () => {
    _getCurrentInstance.mockReturnValueOnce(null)
    vi.spyOn(console, 'warn')
    // stop console run once
    vi.mocked(console.warn).mockImplementationOnce(() => {
      // empty
    })
    mountComposition(() => {
      const id = useInstanceId()

      return {
        id,
      }
    })

    expect(console.warn).toHaveBeenCalledWith('Do not use outside of a component')
  })
})
