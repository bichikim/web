/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {useDocumentHistory} from '../../use-document-history'
import {BoundaryGlueEditor} from '../BoundaryGlueEditor'

test('should batch attach without selecting a vertex and undo the entire operation', () => {
  const history = useDocumentHistory({initialDocument: createDemoDocument()})
  const view = render(() => (
    <BoundaryGlueEditor
      document={history.document()}
      partId="shape-diamond"
      selectedPartIds={['mesh-preview', 'shape-diamond']}
      onDocumentChange={history.setDocument}
    />
  ))
  expect(view.queryByRole('combobox')).toBeNull()
  fireEvent.click(view.getByRole('button', {name: '붙이기'}))
  const connections = history.document().glue!
  expect(connections.length).toBeGreaterThan(0)
  expect(connections.every((glue) => glue.second.partId === 'shape-diamond')).toBe(true)
  expect(view.getByRole('button', {name: '붙이기'})).toBeDisabled()
  history.undo()
  expect(history.document().glue).toBeUndefined()
  history.redo()
  expect(history.document().glue).toEqual(connections)
})

test('should switch distance mode and retain the manual distance', () => {
  const view = render(() => <BoundaryGlueEditor document={createDemoDocument()} />)
  expect(view.queryByRole('spinbutton', {name: '경계 연결 거리'})).toBeNull()
  fireEvent.click(view.getByRole('button', {name: '수동'}))
  const input = view.getByRole('spinbutton', {name: '경계 연결 거리'})
  fireEvent.input(input, {target: {value: '45'}})
  fireEvent.blur(input)
  fireEvent.click(view.getByRole('button', {name: '자동'}))
  expect(view.queryByRole('spinbutton', {name: '경계 연결 거리'})).toBeNull()
  fireEvent.click(view.getByRole('button', {name: '수동'}))
  expect(view.getByRole('spinbutton', {name: '경계 연결 거리'})).toHaveValue(45)
})
