/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {EditorParameterScale} from '../EditorParameterScale'

const parameter = {defaultValue: 0, id: 'z', maximum: 30, minimum: -30, name: 'Z'}

test('should show five evenly spaced values without keyforms', () => {
  const view = render(() => <EditorParameterScale parameter={parameter} />)
  expect(view.getByText('-30')).toBeDefined()
  expect(view.getByText('-15')).toBeDefined()
  expect(view.getByText('0')).toBeDefined()
  expect(view.getByText('15')).toBeDefined()
  expect(view.getByText('30')).toBeDefined()
})

test('should always retain reference numbers when occupied values are nearby', () => {
  const view = render(() => (
    <EditorParameterScale occupiedValues={[1, 7.5, 30]} parameter={parameter} />
  ))
  expect(view.getByText('-30')).toBeDefined()
  expect(view.getByText('-15')).toBeDefined()
  expect(view.getByText('0')).toBeDefined()
  expect(view.getByText('15')).toBeDefined()
  expect(view.getByText('30')).toBeDefined()
  expect(view.getByText('7.5')).toBeDefined()
  expect(view.queryByText('1')).toBeNull()
})
