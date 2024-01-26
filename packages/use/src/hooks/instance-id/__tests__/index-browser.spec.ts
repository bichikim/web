/**
 * @jest-environment jsdom
 */
import {mountComposition} from '@winter-love/test-utils'
import {getWindow} from '@winter-love/utils'
import {getCurrentInstance} from 'vue'
import {useInstanceId} from '../'

jest.mock('@winter-love/utils', () => {
  const actual = jest.requireActual('@winter-love/utils')
  return {
    ...actual,
    getWindow: jest.fn(actual.getWindow),
  }
})

jest.mock('vue', () => {
  const actual = jest.requireActual('vue')
  return {
    ...actual,
    getCurrentInstance: jest.fn(actual.getCurrentInstance),
  }
})

const _isSSR = jest.mocked(getWindow)
const _getCurrentInstance = jest.mocked(getCurrentInstance)

describe('useInstanceId', () => {
  afterEach(() => {
    _isSSR.mockClear()
    jest.spyOn(console, 'warn').mockClear()
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
    _isSSR.mockReturnValueOnce(undefined)
    jest.spyOn(console, 'warn')
    // stop console run once
    jest.mocked(console.warn).mockImplementationOnce(() => {
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
    jest.spyOn(console, 'warn')
    // stop console run once
    jest.mocked(console.warn).mockImplementationOnce(() => {
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
