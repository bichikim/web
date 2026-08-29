/** @vitest-environment jsdom */

import {render, renderHook} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {
  FocusControllerProvider,
  FocusGroup,
  FocusGroupWithElement,
  useFocus,
  useFocusControllerContext,
  useFocusGroup,
} from '../focus'

describe('space focus hooks', () => {
  it('should create and update a focus group from an element', () => {
    const element = document.createElement('div')
    const {result} = renderHook(() =>
      useFocusGroup(element, {isInactive: true, preventMove: {left: true}}),
    )
    const [focusRect, setFocusRect, id] = result

    expect(id).toEqual(expect.any(String))
    expect(focusRect()).toMatchObject({isDirty: true, isInactive: true, preventMove: {left: true}})
    setFocusRect((rect) => ({...rect, isInactive: false}))
    expect(focusRect().isInactive).toBe(false)
  })

  it('should expose local focus state without a controller provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const {result} = renderHook(() => useFocus(null))
    const [isFocused, setFocused] = result

    expect(isFocused()).toBe(false)
    setFocused(true)
    setFocused((previous) => !previous)
    expect(isFocused()).toBe(false)
    expect(warn).toHaveBeenCalled()
  })

  it('should provide a focus controller and render focus group wrappers', () => {
    let controller = null as ReturnType<typeof useFocusControllerContext>
    const element = document.createElement('div')

    const {getByTestId} = render(() =>
      createComponent(FocusControllerProvider, {
        get children() {
          return createComponent(FocusGroup, {
            get children() {
              return createComponent(FocusGroupWithElement, {
                get children() {
                  return createComponent(() => {
                    controller = useFocusControllerContext()

                    return <span data-testid="focus-child">child</span>
                  }, {})
                },
              })
            },
            element,
          })
        },
      }),
    )

    expect(controller).not.toBeNull()
    expect(getByTestId('focus-child')).toBeInTheDocument()
  })
})
