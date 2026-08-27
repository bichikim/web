/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {ref} from '../index'

describe('ref', () => {
  it('should set the mounted element and clear it during cleanup', () => {
    const [element, setElement] = createSignal<Element | null>(null)
    const view = render(() => <div use:ref={setElement}>target</div>)

    expect(element()).toBe(view.getByText('target'))

    view.unmount()

    expect(element()).toBeNull()
  })
})
