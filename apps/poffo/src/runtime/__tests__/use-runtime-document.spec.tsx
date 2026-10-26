/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'
import {createModelSession} from '../../model/create-model-session'
import {WorkspaceProvider} from '../../workspace/WorkspaceProvider'
import {useRuntimeDocument} from '../use-runtime-document'

afterEach(cleanup)
const setup = () => {
  const {result: model} = renderHook(() =>
    createModelSession({document: createDemoDocument(), sessionId: 'shared'}),
  )
  const {result} = renderHook(useRuntimeDocument, {
    wrapper: (props) => (
      <WorkspaceProvider model={model} mode="viewer">
        {props.children}
      </WorkspaceProvider>
    ),
  })
  return {model, runtime: result}
}
const file = (source: string | Promise<string>) => {
  const next = new File([], 'model.json', {type: 'application/json'})
  Object.defineProperty(next, 'text', {value: () => Promise.resolve(source)})
  return next
}

test('should share host edits and undo with no separate runtime document', () => {
  const {model, runtime} = setup()
  const before = model.read().document
  const next = {...before, framesPerSecond: 48}
  model.request({
    document: next,
    expectedRevision: 0,
    ownerId: 'editor',
    requestId: 'edit',
    type: 'edit',
  })
  expect(runtime.document()).toBe(model.read().document)
  expect(runtime.document().framesPerSecond).toBe(48)
  model.request({ownerId: 'editor', requestId: 'undo', type: 'undo'})
  expect(runtime.document()).toBe(before)
})

test('should import through the shared session as one undoable replacement', async () => {
  const {model, runtime} = setup()
  const next = {...model.read().document, framesPerSecond: 48}
  await runtime.loadFile(file(serializeDocument(next)))
  expect(runtime.document().framesPerSecond).toBe(48)
  expect(model.read().undoCount).toBe(1)
  expect(runtime.sessionId()).toBe('shared')
})

test('should retain the host model when an imported document is invalid', async () => {
  const {model, runtime} = setup()
  const before = model.read().document
  await runtime.loadFile(file('{}'))
  expect(runtime.document()).toBe(before)
  expect(runtime.error()).not.toBeNull()
})

test('should reject late file results even when undo has restored the original document reference', async () => {
  const {model, runtime} = setup()
  let finish = (_source: string) => undefined as void
  const source = new Promise<string>((resolve) => {
    finish = resolve
  })
  const before = model.read().document
  const importing = runtime.loadFile(file(source))
  model.request({
    document: {...before, framesPerSecond: 48},
    expectedRevision: 0,
    ownerId: 'editor',
    requestId: 'edit',
    type: 'edit',
  })
  model.request({ownerId: 'editor', requestId: 'undo', type: 'undo'})
  finish(serializeDocument({...before, framesPerSecond: 60}))
  await importing
  expect(runtime.document()).toBe(before)
  expect(runtime.error()).not.toBeNull()
})

test('should discard an older file result after a newer import completes', async () => {
  const {model, runtime} = setup()
  let finish = (_source: string) => undefined as void
  const source = new Promise<string>((resolve) => {
    finish = resolve
  })
  const before = model.read().document
  const first = runtime.loadFile(file(source))
  await runtime.loadFile(file(serializeDocument({...before, framesPerSecond: 48})))
  finish(serializeDocument({...before, framesPerSecond: 60}))
  await first
  expect(runtime.document().framesPerSecond).toBe(48)
  expect(model.read().undoCount).toBe(1)
})
