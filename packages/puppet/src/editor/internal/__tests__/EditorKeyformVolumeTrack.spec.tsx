/** @vitest-environment jsdom */

import {createKeyedParameter3D} from './parameter-keyforms/fixtures'

import {fireEvent, render, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import {isThreeDimensionalParameterBinding, type PuppetParameterValues} from '../../../deformation'
import {createDemoDocument} from '../../../player'
import {EditorKeyformTrack} from '../EditorKeyformTrack'

const renderVolume = (keyformCount = 27) => {
  const source = {...createDemoDocument(), motions: [], parameterBindings: [], parameters: []}
  const added = createKeyedParameter3D({document: source, nodeIds: ['mesh-preview']})!
  if (!isThreeDimensionalParameterBinding(added.binding)) {
    throw new Error('3차원 바인딩이 필요합니다.')
  }
  const binding = {...added.binding, keyforms: added.binding.keyforms.slice(0, keyformCount)}
  const [values, setValues] = createSignal<PuppetParameterValues>([0, 0, 0])
  const handlers = {
    onKeyformAdd: vi.fn(),
    onKeyformMove: vi.fn(),
    onKeyformPlaneDelete: vi.fn(),
    onKeyformSelect: vi.fn(),
    onValueChange: vi.fn(setValues),
  }
  const view = render(() => (
    <EditorKeyformTrack
      active={true}
      binding={binding}
      parameters={added.document.parameters!}
      values={values()}
      onKeyformDelete={vi.fn()}
      {...handlers}
    />
  ))
  return {bindingId: added.binding.id, handlers, setValues, view}
}

test('should show XY keyforms and one diamond per occupied Z plane', () => {
  const {view} = renderVolume()
  expect(view.getAllByRole('button', {name: /^키폼 선택: /})).toHaveLength(9)
  expect(view.queryAllByRole('button', {name: /^Parameter 1 Z .* 키폼$/})).toHaveLength(0)
  expect(view.getAllByRole('button', {name: /^Parameter 1 Z .* 평면$/})).toHaveLength(3)
  expect(view.getByRole('slider', {name: 'Parameter 1 Z 현재 값'})).toBeDefined()
})

test('should show a Z plane when it contains only one XYZ keyform', () => {
  const {view} = renderVolume(1)
  expect(view.getAllByRole('button', {name: /^Parameter 1 Z .* 평면$/})).toHaveLength(1)
  expect(view.getByRole('button', {name: 'Parameter 1 Z -30 평면'})).toBeDefined()
})

test('should select XY keys without changing the current Z', () => {
  const {bindingId, handlers, view} = renderVolume()
  fireEvent.click(view.getByRole('button', {name: '키폼 선택: 30, 30'}))
  // 현재 Z의 키폼만 선택한다.
  expect(handlers.onKeyformSelect).toHaveBeenLastCalledWith(bindingId, [30, 30, 0])
})

test('should prevent adding keyforms from the Z track', () => {
  const {view, setValues, handlers} = renderVolume()
  setValues([12, 7, 10])
  const track = view.getByLabelText('Parameter 1 Z 평면 트랙')
  fireEvent.dblClick(track)
  fireEvent.contextMenu(track)
  expect(view.queryByRole('menuitem', {name: '평면 추가'})).toBeNull()
  expect(view.queryByRole('menuitem', {name: '키폼 추가'})).toBeNull()
  expect(handlers.onKeyformAdd).not.toHaveBeenCalled()
})

test('should retain movement and deletion of occupied Z planes', () => {
  const {bindingId, view, handlers} = renderVolume()
  const plane = view.getByRole('button', {name: 'Parameter 1 Z -30 평면'})
  fireEvent.keyDown(plane, {key: 'ArrowRight'})
  const [, from, to] = handlers.onKeyformMove.mock.lastCall!
  expect(from).toEqual([0, 0, -30])
  expect(to.slice(0, 2)).toEqual([0, 0])
  expect(to[2]).toBeGreaterThan(-30)
  fireEvent.keyDown(view.getByRole('button', {name: 'Parameter 1 Z -30 평면'}), {key: 'Delete'})
  expect(handlers.onKeyformPlaneDelete).toHaveBeenCalledWith(bindingId, -30)
})

test('should show no selectable XY keys between existing Z planes', () => {
  const {view, setValues, handlers} = renderVolume()
  setValues([0, 0, 10])
  expect(view.queryAllByRole('button', {name: /^키폼 선택: /})).toHaveLength(0)
  expect(view.queryAllByRole('button', {name: /^키폼 추가 위치: /})).toHaveLength(0)
  expect(handlers.onKeyformSelect).not.toHaveBeenCalled()
})
test('should preserve XY when selecting another Z plane', () => {
  const {view, setValues, handlers} = renderVolume()
  setValues([12, 7, 0])
  fireEvent.click(view.getByRole('button', {name: 'Parameter 1 Z -30 평면'}))
  expect(handlers.onValueChange).toHaveBeenLastCalledWith([12, 7, -30])
})

test('should add a missing XY point at the exact current Z only', () => {
  const {view, setValues, handlers} = renderVolume()
  setValues([0, 0, 10])
  const track = view.getByLabelText('Parameter 1 X와 Parameter 1 Y 2차원 키폼 grid')
  // 격자는 별도 역할이 없으므로 의미 있는 트랙을 찾은 뒤 직접 조작 면을 지정한다.
  const grid = track.querySelector('.parameter-grid')!
  fireEvent.dblClick(grid)
  expect(handlers.onValueChange).toHaveBeenLastCalledWith([0, 0, 10])
  expect(handlers.onKeyformAdd).toHaveBeenCalledTimes(1)
})

test.each([0, 27])('should retain Z reference numbers with %i keyforms', (count) => {
  const {view} = renderVolume(count)
  const track = within(view.getByLabelText('Parameter 1 Z 평면 트랙'))
  expect(track.getAllByText('-30')).toHaveLength(1)
  expect(track.getAllByText('-15')).toHaveLength(1)
  expect(track.getAllByText('0')).toHaveLength(1)
  expect(track.getAllByText('15')).toHaveLength(1)
  expect(track.getAllByText('30')).toHaveLength(1)
})
