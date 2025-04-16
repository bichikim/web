import {describe, expect, it, vi} from 'vitest'
import {useTabButton} from './tab-button'
import {renderHook} from '@solidjs/testing-library'
import {HTabProvider} from './HTabProvider'

describe('use-tab-button', () => {
  it('should render', () => {
    const {result, cleanup} = renderHook(
      () => {
        const tab1 = useTabButton('tab1')
        const tab2 = useTabButton('tab2')

        const tab3 = useTabButton('tab3')

        return {
          tab1,
          tab2,
          tab3,
        }
      },
      {
        wrapper: (props) => {
          return <HTabProvider activeTab="tab1">{props.children}</HTabProvider>
        },
      },
    )

    expect(result.tab1.isSelected()).toBe(true)
    expect(result.tab2.isSelected()).toBe(false)
    expect(result.tab3.isSelected()).toBe(false)
    result.tab2.handleSelect()
    expect(result.tab1.isSelected()).toBe(false)
    expect(result.tab2.isSelected()).toBe(true)
    expect(result.tab3.isSelected()).toBe(false)
    result.tab3.handleSelect()
    expect(result.tab1.isSelected()).toBe(false)
    expect(result.tab2.isSelected()).toBe(false)
    expect(result.tab3.isSelected()).toBe(true)
    cleanup()
  })

  it('탭 프로바이더가 없는 경우 경고를 출력해야 합니다', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // skip message
    })

    const {result, cleanup} = renderHook(() => {
      return useTabButton('tab1')
    })

    result.handleSelect()
    expect(consoleWarnSpy).toHaveBeenCalledWith('setTabValue is not implemented')
    expect(result.isSelected()).toBe(false)
    consoleWarnSpy.mockRestore()
  })
})
