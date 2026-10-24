/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'

import {HTourSpotlight} from '../HTourSpotlight'

describe('HTourSpotlight', () => {
  it('should expose the padded visible target bounds', async () => {
    const element = document.createElement('button')
    element.getBoundingClientRect = () => new DOMRect(40, 60, 120, 48)

    const {getByTestId} = render(() => (
      <HTourSpotlight element={element} padding={8}>
        {(bounds) => (
          <output data-testid="bounds">
            {bounds() === null
              ? 'none'
              : `${bounds()?.left},${bounds()?.top},${bounds()?.width},${bounds()?.height}`}
          </output>
        )}
      </HTourSpotlight>
    ))

    await waitFor(() => expect(getByTestId('bounds')).toHaveTextContent('32,52,136,64'))
  })

  it('should expose absence when the target is outside the viewport', async () => {
    const element = document.createElement('button')
    element.getBoundingClientRect = () => new DOMRect(-200, -100, 40, 40)

    const Harness = () => {
      const [target, setTarget] = createSignal<Element | null>(null)

      return (
        <>
          <button onClick={() => setTarget(element)} type="button">
            Set target
          </button>
          <HTourSpotlight element={target()}>
            {(bounds) => (
              <output data-testid="bounds">{bounds() === null ? 'none' : 'visible'}</output>
            )}
          </HTourSpotlight>
        </>
      )
    }

    const {getByRole, getByTestId} = render(() => <Harness />)

    await waitFor(() => expect(getByTestId('bounds')).toHaveTextContent('none'))
    getByRole('button', {name: 'Set target'}).click()
    await waitFor(() => expect(getByTestId('bounds')).toHaveTextContent('none'))
  })
})
