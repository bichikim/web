/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, test, vi} from 'vitest'

import {EditorColorField} from '../EditorColorField'

test('should disable both color entry paths', () => {
  render(() => <EditorColorField label="색상" value="#000000" disabled onValueChange={vi.fn()} />)
  expect(screen.getByRole('textbox', {name: '색상'})).toBeDisabled()
  expect(screen.getByRole('button', {name: '색상 선택'})).toBeDisabled()
})
