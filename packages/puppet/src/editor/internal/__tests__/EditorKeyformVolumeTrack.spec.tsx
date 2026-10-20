/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import type {PuppetParameterValues} from '../../../deformation'
import {createDemoDocument} from '../../../player'
import {EditorKeyformTrack} from '../EditorKeyformTrack'
import {addThreeDimensionalParameter} from '../parameter-keyforms'

const renderVolume = () => {
  const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
  const added = addThreeDimensionalParameter({document: source, nodeIds: ['mesh-preview']})!
  const [values, setValues] = createSignal<PuppetParameterValues>([0, 0, 10])
  const handlers = {
    onKeyformMove: vi.fn(),
    onKeyformPlaneDelete: vi.fn(),
    onKeyformSelect: vi.fn(),
    onValueChange: vi.fn(setValues),
  }
  const view = render(() => (
    <EditorKeyformTrack
      active={true}
      binding={added.binding}
      parameters={added.document.parameters!}
      values={values()}
      onKeyformAdd={vi.fn()}
      onKeyformDelete={vi.fn()}
      {...handlers}
    />
  ))
  return {bindingId: added.binding.id, handlers, view}
}

test('should show the point grid once and a marker per plane', () => {
  const {view} = renderVolume()
  expect(view.getAllByRole('button', {name: /^키폼 선택: /})).toHaveLength(9)
  expect(view.getAllByRole('button', {name: /^Parameter 1 Z .* 키폼$/})).toHaveLength(3)
})

test('should select grid points on the plane nearest the third value', () => {
  const {bindingId, handlers, view} = renderVolume()
  fireEvent.click(view.getByRole('button', {name: '키폼 선택: 30, 30'}))
  // 10 is nearest the plane at 0.
  expect(handlers.onKeyformSelect).toHaveBeenLastCalledWith(bindingId, [30, 30, 0])
})

test('should move and delete whole planes from the third-parameter track', async () => {
  const {bindingId, handlers, view} = renderVolume()
  const plane = view.getByRole('button', {name: 'Parameter 1 Z -30 키폼'})
  fireEvent.keyDown(plane, {key: 'ArrowRight'})
  const [, from, to] = handlers.onKeyformMove.mock.lastCall!
  expect(from).toEqual([0, 0, -30])
  expect(to.slice(0, 2)).toEqual([0, 0])
  expect(to[2]).toBeGreaterThan(-30)

  fireEvent.contextMenu(view.getByRole('button', {name: 'Parameter 1 Z 30 키폼'}))
  fireEvent.keyDown(await screen.findByRole('menuitem', {name: '키폼 삭제'}), {key: 'Enter'})
  expect(handlers.onKeyformPlaneDelete).toHaveBeenCalledWith(bindingId, 30)
})
