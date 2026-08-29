/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, test, vi} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorLayerPanel} from '../EditorLayerPanel'

describe('EditorLayerPanel', () => {
  test('should render and select each example layer', () => {
    const onPartSelect = vi.fn()
    const view = render(() => (
      <EditorLayerPanel
        activePartId="mesh-preview"
        document={createDemoDocument()}
        onPartSelect={onPartSelect}
      />
    ))

    expect(view.getByRole('button', {name: /mesh-preview/}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(view.getByRole('button', {name: /shape-circle/})).toBeDefined()
    expect(view.getByRole('button', {name: /shape-diamond/})).toBeDefined()

    fireEvent.click(view.getByRole('button', {name: /shape-circle/}))

    expect(onPartSelect).toHaveBeenCalledWith('shape-circle')
  })
})
