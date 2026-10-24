/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {createSceneSelection} from '../selection-actions'
import {type EditorSelectionIntent, useEditorSelection} from '../use-editor-selection'

const frames = new Map<number, FrameRequestCallback>()
let frameId = 0
const paint = () => {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((callback) => callback(0))
}
beforeEach(() => {
  frames.clear()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
})
afterEach(() => vi.unstubAllGlobals())

const createSelection = () =>
  createRoot((dispose) => {
    const [document, setDocument] = createSignal(createDemoDocument())
    const [current, setCurrent] = createSignal<EditorSelectionIntent>({
      bindingId: null,
      layers: createSceneSelection('mesh-preview'),
      workspace: 'modeling',
    })
    const commit = vi.fn((selection: EditorSelectionIntent) => setCurrent(selection))
    const state = useEditorSelection({current, document, onCommit: commit})
    return {commit, current, dispose, document, setDocument, state}
  })

test('should preserve a pending selection through edits that retain its target', () => {
  const fixture = createSelection()
  const layers = createSceneSelection('shape-circle')
  fixture.state.selectLayer(layers)
  fixture.setDocument({...fixture.document(), name: 'Updated'})
  expect(fixture.state.layers()).toBe(layers)
  expect(fixture.state.pending()).toBe(true)
  paint()
  paint()
  expect(fixture.current().layers).toBe(layers)
  fixture.dispose()
})

test('should cancel a removed target and explicit document replacement before preparation', () => {
  const fixture = createSelection()
  fixture.state.selectLayer(createSceneSelection('shape-circle'))
  fixture.setDocument({...fixture.document(), scene: {roots: []}})
  expect(fixture.state.layers()).toBe(fixture.current().layers)
  paint()
  paint()
  expect(fixture.commit).not.toHaveBeenCalled()
  fixture.state.selectWorkspace('animation')
  fixture.state.reset()
  paint()
  paint()
  expect(fixture.state.workspace()).toBe('modeling')
  expect(fixture.state.pending()).toBe(false)
  expect(fixture.commit).not.toHaveBeenCalled()
  fixture.dispose()
})

test('should combine rapid layer, parameter and workspace requests into the latest intent', () => {
  const fixture = createSelection()
  const layers = createSceneSelection('shape-circle')
  fixture.state.selectWorkspace('animation')
  fixture.state.selectLayer(layers)
  fixture.state.selectBinding('last-binding')
  expect(fixture.state.workspace()).toBe('animation')
  expect(fixture.state.bindingId()).toBe('last-binding')
  expect(fixture.current().workspace).toBe('modeling')
  paint()
  paint()
  expect(fixture.commit).toHaveBeenCalledExactlyOnceWith({
    bindingId: 'last-binding',
    layers,
    workspace: 'animation',
  })
  fixture.dispose()
})

test('should discard a pending binding removed by a document edit', () => {
  const fixture = createSelection()
  fixture.state.selectBinding(fixture.document().parameterBindings![0]!.id)
  fixture.setDocument({...fixture.document(), parameterBindings: [], parameters: []})
  paint()
  paint()
  expect(fixture.state.bindingId()).toBeNull()
  expect(fixture.state.pending()).toBe(false)
  expect(fixture.commit).not.toHaveBeenCalled()
  fixture.dispose()
})

test('should cancel preparation when returning to the already prepared selection', () => {
  const fixture = createSelection()
  fixture.state.selectWorkspace('modeling')
  expect(fixture.state.pending()).toBe(false)
  fixture.state.selectLayer(createSceneSelection('shape-circle'))
  fixture.state.selectLayer(createSceneSelection('mesh-preview'))
  expect(fixture.state.pending()).toBe(false)
  paint()
  paint()
  expect(fixture.commit).not.toHaveBeenCalled()
  fixture.dispose()
})
