/** @vitest-environment jsdom */

import {useEvent} from '@winter-love/solid-use/event'
import {createRoot} from 'solid-js'
import {expectTypeOf, it} from 'vitest'

it('should infer event maps through the public consumer path', () => {
  const dispose = createRoot((dispose) => {
    useEvent(window, 'resize', (event) => {
      expectTypeOf(event).toEqualTypeOf<UIEvent>()
    })
    useEvent(document, 'visibilitychange', (event) => {
      expectTypeOf(event).toEqualTypeOf<Event>()
    })
    useEvent(document.createElement('button'), 'click', (event) => {
      expectTypeOf(event).toEqualTypeOf<PointerEvent>()
    })
    useEvent(new EventTarget(), 'change', (event) => {
      expectTypeOf(event).toEqualTypeOf<Event>()
    })
    useEvent(window, 'pomo:change', (event) => {
      expectTypeOf(event).toEqualTypeOf<CustomEvent<unknown>>()
    })

    return dispose
  })

  dispose()
})
