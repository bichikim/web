/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createComponent, useContext} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {
  FocusControllerContext,
  type FocusControllerContextValue,
  FocusControllerProvider,
  useFocusController,
} from '../FocusController'

describe('FocusController', () => {
  it('should provide an inert controller and warnings without a provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let controller: ReturnType<typeof useFocusController> | undefined

    render(() => {
      controller = useFocusController()

      return null
    })

    expect(controller?.moveFocus({x: 1, y: 0})).toBeNull()
    controller?.active(true)
    controller?.registerFocus([{x: 1, y: 2}])
    expect(warn).toHaveBeenCalled()
  })

  it('should provide configured controller context to children', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let contextValue: FocusControllerContextValue | undefined

    render(() =>
      createComponent(FocusControllerProvider, {
        get children() {
          return createComponent(() => {
            contextValue = useContext(FocusControllerContext)

            return null
          }, {})
        },
        connector: '|',
        globalMap: true,
        id: 'focus-root',
        separator: ',',
      }),
    )

    expect(contextValue).toMatchObject({
      globalMap: true,
      id: 'focus-root',
      keyOptions: {connector: '|', separator: ','},
    })
    expect(contextValue?.focusController).toBeDefined()
    expect(warn).toHaveBeenCalledWith('DelegatedEventContext is not provided')
  })
})
