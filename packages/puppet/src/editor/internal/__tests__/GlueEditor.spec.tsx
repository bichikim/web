import {addGlue} from '../glue'
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

test('should edit the selected keyform with one undo transaction and preserve static Glue', () => {
  const document = addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  const history = useDocumentHistory({initialDocument: document})
  const view = render(() => (
    <GlueEditor
      document={history.document()}
      partId="mesh-preview"
      editMode="parameter"
      activeBindingId={document.parameterBindings![0]!.id}
      activeKeyformValues={[0, 0]}
      onKeyformChange={history.setDocument}
      onEditStart={history.beginTransaction}
      onEditEnd={history.endTransaction}
    />
  ))
  const input = view.getByRole('spinbutton', {name: 'glue-1 붙임 강도'})
  fireEvent.focus(input)
  fireEvent.input(input, {target: {value: '40'}})
  fireEvent.change(input)
  fireEvent.blur(input)
  expect(input).toHaveValue(40)
  expect(history.document().glue![0]!.strength).toBe(1)
  expect(history.undo()).toBe(true)
  expect(input).toHaveValue(100)
  expect(history.redo()).toBe(true)
  expect(input).toHaveValue(40)
})

test('should edit and undo static Glue without creating a parameter', () => {
  const source = {...createDemoDocument(), parameterBindings: [], parameters: []}
  const document = addGlue(
    source,
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!
  const history = useDocumentHistory({initialDocument: document})
  const view = render(() => (
    <GlueEditor
      document={history.document()}
      partId="shape-diamond"
      editMode="parameter"
      onDocumentChange={history.setDocument}
      onEditStart={history.beginTransaction}
      onEditEnd={history.endTransaction}
    />
  ))
  const input = view.getByRole('spinbutton', {name: 'glue-1 붙임 강도'})
  expect(input).toBeEnabled()
  input.focus()
  fireEvent.input(input, {target: {value: '35'}})
  expect(input).toHaveFocus()
  fireEvent.change(input)
  fireEvent.blur(input)
  expect(history.document().glue![0]!.strength).toBe(0.35)
  expect(history.document().parameterBindings).toEqual([])
  expect(history.document().parameters).toEqual([])
  expect(history.undo()).toBe(true)
  expect(input).toHaveValue(100)
})
