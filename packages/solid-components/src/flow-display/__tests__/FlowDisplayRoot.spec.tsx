/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {FlowDisplayBody} from '../FlowDisplayBody'
import {FlowTextContent} from '../FlowDisplayContent'
import {FlowDisplayContext, FlowDisplayRoot} from '../FlowDisplayRoot'

describe('FlowDisplayRoot', () => {
  it('should expose reactive selection state to descendants', async () => {
    const Probe = () => {
      const [state, actions] = useContext(FlowDisplayContext)

      return <button onClick={() => actions.handleSelect(true)}>{String(state().move)}</button>
    }

    const view = render(() => (
      <FlowDisplayRoot>
        <Probe />
      </FlowDisplayRoot>
    ))
    const button = view.getByRole('button')

    expect(button.textContent).toBe('false')

    await fireEvent.click(button)

    expect(button.textContent).toBe('true')
  })

  it('should toggle content movement when the body is clicked', async () => {
    const view = render(() => (
      <FlowDisplayRoot>
        <FlowDisplayBody>Toggle</FlowDisplayBody>
        <FlowTextContent>Content</FlowTextContent>
      </FlowDisplayRoot>
    ))
    const content = view.getByText('Content')

    expect(content.getAttribute('data-move')).toBe('false')

    await fireEvent.click(view.getByText('Toggle'))

    expect(content.getAttribute('data-move')).toBe('true')
  })
})
