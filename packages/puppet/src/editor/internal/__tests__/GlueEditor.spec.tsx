/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {createDemoDocument} from '../../../player'
import {useDocumentHistory} from '../../use-document-history'
import {GlueEditor} from '../GlueEditor'

test('should connect selected boundary points and support undo and unlink', () => {
  const [part, setPart] = createSignal('mesh-preview')
  const history = useDocumentHistory({initialDocument: createDemoDocument()})
  const view = render(() => (
    <GlueEditor
      document={history.document()}
      partId={part()}
      vertexIndex={0}
      onDocumentChange={history.setDocument}
    />
  ))
  fireEvent.click(view.getByRole('button', {name: '선택 정점에서 연결 시작'}))
  expect(view.getByRole('button', {name: '이 정점과 붙이기'})).toBeDisabled()
  setPart('shape-diamond')
  fireEvent.click(view.getByRole('button', {name: '이 정점과 붙이기'}))
  expect(history.document().glue).toHaveLength(1)
  expect(view.getByRole('spinbutton', {name: 'glue-1 붙임 강도'})).toHaveValue(100)
  history.undo()
  expect(history.document().glue).toBeUndefined()
  history.redo()
  fireEvent.click(view.getByRole('button', {name: '연결 해제'}))
  expect(history.document().glue).toEqual([])
})
