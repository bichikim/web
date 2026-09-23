/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createRoot, useContext} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {ButtonContext} from '../button/context'
import {CheckboxContext} from '../checkbox/context'
import {DragButtonContext} from '../drag-button/context'
import {
  createTimeout,
  ToastActionContext,
  ToastContentContext,
  ToastContext,
  ToastInnerContext,
} from '../toast/context'

describe('component context defaults', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should expose button defaults and reject unimplemented actions', () => {
    createRoot((dispose) => {
      const context = useContext(ButtonContext)

      expect(context.value()).toEqual({
        disabled: false,
        loading: 'false',
        loadingAnimation: 'false',
        loadingProcess: undefined,
        tag: 'button',
      })
      expect(() => context.handleClick(undefined as never)).toThrow('not implemented')
      expect(() => context.handleTouchEnd(undefined as never)).toThrow('not implemented')
      expect(() => context.handleTouchStart(undefined as never)).toThrow('not implemented')
      dispose()
    })
  })

  it('should expose checkbox defaults and reject toggling without a provider', () => {
    createRoot((dispose) => {
      const [value, actions] = useContext(CheckboxContext)

      expect(value()).toEqual({checked: false, disabled: false, id: '', required: false})
      expect(() => actions.handleToggleChecked()).toThrow('not implemented')
      dispose()
    })
  })

  it('should expose drag defaults and reject pointer actions without a provider', () => {
    createRoot((dispose) => {
      const [value, actions] = useContext(DragButtonContext)

      expect(value()).toEqual({dragX: 0, dragY: 0})
      expect(() => actions.handleMouseDown(new MouseEvent('mousedown'))).toThrow(
        'handleMouseDown is not implemented',
      )
      expect(() => actions.handleTouchStart(new TouchEvent('touchstart'))).toThrow(
        'handleTouchStart is not implemented',
      )
      dispose()
    })
  })

  it('should expose inert toast defaults', () => {
    createRoot((dispose) => {
      const context = useContext(ToastContext)
      const inner = useContext(ToastInnerContext)
      const content = useContext(ToastContentContext)
      const action = useContext(ToastActionContext)

      expect(() => context.setMessage({id: 'id', message: 'message'})).not.toThrow()
      expect(() => context.turnOffMessage('id')).not.toThrow()
      expect(inner.messages()).toEqual(new Map())
      expect(content.message).toEqual({id: '', message: ''})
      expect(action).toMatchObject({label: '', type: 'click'})
      expect(() => action.action?.({close: vi.fn(), setAction: vi.fn()})).not.toThrow()
      dispose()
    })
  })

  it('should schedule and cancel toast timeouts', () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const cancel = createTimeout(100)(callback)

    vi.advanceTimersByTime(99)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()

    const cancelled = vi.fn()
    const cancelSecond = createTimeout(100)(cancelled)
    cancelSecond()
    vi.runAllTimers()

    expect(cancelled).not.toHaveBeenCalled()
    cancel()
  })

  it('should provide overridden context values to descendants', () => {
    const Probe = () => {
      const value = useContext(ButtonContext).value()

      return <output>{`${value.tag}:${value.disabled}`}</output>
    }
    const view = render(() => (
      <ButtonContext.Provider
        value={{
          handleClick: vi.fn(),
          handleTouchEnd: vi.fn(),
          handleTouchStart: vi.fn(),
          value: () => ({
            disabled: true,
            loading: 'false',
            loadingAnimation: 'false',
            tag: 'a',
          }),
        }}
      >
        <Probe />
      </ButtonContext.Provider>
    ))

    expect(view.getByText('a:true')).toBeDefined()
  })
})
