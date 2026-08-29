/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {describe, expect, test} from 'vitest'

import {createDemoDocument} from '../../../player'
import {EditorInspector} from '../EditorInspector'

describe('EditorInspector', () => {
  test('should omit motion scaling controls while retaining mesh information', () => {
    const view = render(() => (
      <EditorInspector document={createDemoDocument()} notice="편집 결과" />
    ))

    expect(view.queryByText('MOTION SCALE')).toBeNull()
    expect(view.queryByRole('slider')).toBeNull()
    expect(view.getByText('4')).toBeDefined()
    expect(view.getByText('편집 결과')).toBeDefined()
  })

  test('should show information for the selected example layer', () => {
    const view = render(() => (
      <EditorInspector activePartId="shape-circle" document={createDemoDocument()} />
    ))

    expect(view.getByText('shape-circle')).toBeDefined()
    expect(view.getByText('12')).toBeDefined()
  })
})
