/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import type {JSXElement} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {Slot} from '../Slot'
import {useSlots} from '../use-slots'

interface SlotHarnessProps {
  children?: JSXElement
}

const SlotHarness = (props: SlotHarnessProps) => {
  const slots = useSlots(() => props.children)

  return (
    <main>
      <header>{slots.header}</header>
      <section>{slots.default}</section>
    </main>
  )
}

describe('Slot', () => {
  it('should project named and default children into their destinations', () => {
    const view = render(() => (
      <SlotHarness>
        <span>Default content</span>
        <Slot name="header">Header content</Slot>
      </SlotHarness>
    ))

    expect(view.getByRole('banner').textContent).toBe('Header content')
    expect(view.getByText('Default content').parentElement?.tagName).toBe('SECTION')
  })
})
