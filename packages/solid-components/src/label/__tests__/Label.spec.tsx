/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {LabelContent, LabelProvider} from '../Label'

describe('Label', () => {
  it('should associate content with the explicit target', () => {
    const view = render(() => (
      <LabelProvider targetId="email">
        <LabelContent>Email</LabelContent>
        <input id="email" />
      </LabelProvider>
    ))

    expect(view.getByLabelText('Email')).toBe(view.container.querySelector('#email'))
  })

  it('should generate a target identifier when one is omitted', () => {
    const view = render(() => (
      <LabelProvider>
        <LabelContent>Generated</LabelContent>
      </LabelProvider>
    ))

    expect(view.getByText('Generated').getAttribute('for')).toBeTruthy()
  })
})
