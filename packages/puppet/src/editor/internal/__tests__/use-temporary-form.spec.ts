import type {PuppetDocument} from '../../../player/document'
import type {ModelCommandResult} from '../../model'
/** @vitest-environment jsdom */

import {addGlue, setGlueKeyform} from '../glue'
import {createRoot, createSignal, flush} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player/create-demo-document'
import {useTemporaryForm} from '../use-temporary-form'
import {applyTemporaryForm, readTemporaryForm} from '../temporary-form'

test('should accumulate a layer draft, hide on navigation, preview and explicitly save', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const binding = document.parameterBindings![0]!
    const nodeId = binding.keyforms[0]!.parts[0]!.partId
    const [node, setNode] = createSignal(nodeId)
    const [values, setValues] = createSignal<readonly [number, number]>([15, 0])
    const [key, setKey] = createSignal<readonly [number, number] | null>(null)
    const onChange = vi.fn<(document: PuppetDocument) => ModelCommandResult>(() => ({
      changed: true,
      ok: true,
      revision: 1,
    }))
    const session = useTemporaryForm({
      bindingId: () => binding.id,
      document: () => document,
      enabled: () => true,
      keyformValues: key,
      nodeId: node,
      onDocumentChange: onChange,
      parameterValues: values,
    })
    const edit = () => {
      const target = session.target()!
      const form = readTemporaryForm({...target, nodeId})!
      session.update(
        applyTemporaryForm({
          ...target,
          form: {
            ...form,
            parts: form.parts.map((part) => ({
              ...part,
              vertices: part.vertices.map((value, index) => (index === 0 ? value + 10 : value)),
            })),
          },
          nodeId,
        })!,
      )
    }
    return () => {
      flush()
      edit()
      flush()
      expect(session.hasChanges()).toBe(true)
      const first = session.form()!.parts[0]!.vertices[0]!
      edit()
      flush()
      expect(session.form()!.parts[0]!.vertices[0]).toBe(first + 10)
      flush()
      expect(onChange).not.toHaveBeenCalled()
      session.hide()
      setNode('shape-diamond')
      flush()
      expect(session.form()).toBeUndefined()
      flush()
      expect(session.hasChanges()).toBe(true)
      setNode(nodeId)
      flush()
      expect(session.form()).toBeDefined()
      flush()
      expect(session.showing()).toBe(false)
      setValues([30, 0])
      setKey([30, 0])
      session.setPreview(true)
      flush()
      expect(session.showing()).toBe(true)
      session.setPreview(false)
      flush()
      expect(session.showing()).toBe(false)
      flush()
      expect(session.save()).toBe(true)
      flush()
      expect(onChange).toHaveBeenCalledOnce()
      flush()
      expect(session.form()).toBeUndefined()
      flush()
      expect(session.hasChanges()).toBe(false)
      dispose()
    }
  })())

test('should preserve ordinary part properties without committing the temporary key', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const binding = document.parameterBindings![0]!
    const nodeId = binding.keyforms[0]!.parts[0]!.partId
    const onChange = vi.fn<(document: PuppetDocument) => ModelCommandResult>(() => ({
      changed: true,
      ok: true,
      revision: 1,
    }))
    const session = useTemporaryForm({
      bindingId: () => binding.id,
      document: () => document,
      enabled: () => true,
      keyformValues: () => null,
      nodeId: () => nodeId,
      onDocumentChange: onChange,
      parameterValues: () => [15, 0],
    })
    const working = session.document()
    const parts = working.parts.map((part) =>
      part.id === nodeId
        ? {...part, properties: {...part.properties, blendMode: 'screen' as const}}
        : part,
    )
    return () => {
      flush()
      session.update({...working, parts})
      flush()
      expect(session.form()).toBeUndefined()
      flush()
      expect(onChange.mock.calls[0]![0].parameterBindings).toBe(document.parameterBindings)
      flush()
      expect(onChange.mock.calls[0]![0].parts[0]?.properties?.blendMode).toBe('screen')
      dispose()
    }
  })())

test('should retain Glue as a temporary form until explicitly saved to a selected key', () =>
  createRoot((dispose) => {
    const source = addGlue(
      createDemoDocument(),
      {partId: 'mesh-preview', vertexIndex: 0},
      {partId: 'shape-diamond', vertexIndex: 0},
    )!
    const [key, setKey] = createSignal<readonly [number, number] | null>(null)
    const onChange = vi.fn<(document: PuppetDocument) => ModelCommandResult>(() => ({
      changed: true,
      ok: true,
      revision: 1,
    }))
    const session = useTemporaryForm({
      bindingId: () => source.parameterBindings![0]!.id,
      document: () => source,
      enabled: () => true,
      keyformValues: key,
      nodeId: () => 'mesh-preview',
      onDocumentChange: onChange,
      parameterValues: () => [15, 0],
    })
    const target = session.target()!
    return () => {
      flush()
      session.update(
        setGlueKeyform({...target, changes: {strength: 0.4, weight: 0.5}, glueId: 'glue-1'})!,
      )
      flush()
      expect(onChange).not.toHaveBeenCalled()
      flush()
      expect(session.form()!.parts[0]!.glue).toEqual([{id: 'glue-1', strength: 0.4, weight: 0.5}])
      setKey([30, 0])
      flush()
      expect(session.save()).toBe(true)
      const saved = onChange.mock.calls[0]![0]
      flush()
      expect(
        saved.parameterBindings![0]!.keyforms.find(
          (form) => form.values[0] === 30 && form.values[1] === 0,
        )!.parts[0]!.glue,
      ).toEqual([{id: 'glue-1', strength: 0.4, weight: 0.5}])
      flush()
      expect(saved.glue![0]!.strength).toBe(1)
      dispose()
    }
  })())

test('should retain parameter map identity on selection and propagate changed values', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const [node, setNode] = createSignal(document.parts[0]!.id)
    const [map, setMap] = createSignal({'angle-x': 0, 'angle-y': 0})
    const session = useTemporaryForm({
      bindingId: () => document.parameterBindings![0]!.id,
      document: () => document,
      enabled: () => false,
      keyformValues: () => null,
      nodeId: node,
      onDocumentChange: vi.fn<(document: PuppetDocument) => ModelCommandResult>(() => ({
        changed: true,
        ok: true,
        revision: 1,
      })),
      parameterValueMap: map,
      parameterValues: () => [0, 0],
    })
    const initial = session.valueMap()
    return () => {
      flush()
      setNode(document.parts[1]!.id)
      setMap({...map()})
      flush()
      expect(session.valueMap()).toBe(initial)
      setMap({'angle-x': 15, 'angle-y': 0})
      flush()
      expect(session.valueMap()).not.toBe(initial)
      flush()
      expect(session.valueMap()['angle-x']).toBe(15)
      dispose()
    }
  })())

const createDraft = (onChange: (document: PuppetDocument) => ModelCommandResult) => {
  const document = createDemoDocument()
  const binding = document.parameterBindings![0]!
  const nodeId = binding.keyforms[0]!.parts[0]!.partId
  const [key, setKey] = createSignal<readonly [number, number] | null>(null)
  const session = useTemporaryForm({
    bindingId: () => binding.id,
    document: () => document,
    enabled: () => true,
    keyformValues: key,
    nodeId: () => nodeId,
    onDocumentChange: onChange,
    parameterValues: () => [15, 0],
  })
  const edit = () => {
    const target = session.target()!
    const form = readTemporaryForm({...target, nodeId})!
    session.update(
      applyTemporaryForm({
        ...target,
        form: {
          ...form,
          parts: form.parts.map((part) => ({
            ...part,
            vertices: part.vertices.map((value) => value + 1),
          })),
        },
        nodeId,
      })!,
    )
  }
  const seed = () => {
    edit()
    setKey([30, 0])
    flush()
  }
  return {edit, seed, session}
}

test('should retain a rejected draft and clear it only after a successful retry', () =>
  createRoot((dispose) => {
    const commit = vi
      .fn<(document: PuppetDocument) => ModelCommandResult>()
      .mockReturnValueOnce({error: {code: 'busy'}, ok: false})
      .mockReturnValueOnce({changed: true, ok: true, revision: 1})
    const {seed, session} = createDraft(commit)
    return () => {
      seed()
      const draft = session.form()
      expect(session.save()).toBe(false)
      flush()
      expect(session.form()).toBe(draft)
      flush()
      expect(session.save()).toBe(true)
      flush()
      expect(session.hasChanges()).toBe(false)
      dispose()
    }
  })())

test('should retain a newer draft created by a synchronous host notification', () =>
  createRoot((dispose) => {
    const commit = vi.fn<(document: PuppetDocument) => ModelCommandResult>()
    const {edit, seed, session} = createDraft(commit)
    commit.mockImplementation(() => {
      session.setPreview(true)
      flush()
      edit()
      return {changed: true, ok: true, revision: 1}
    })
    return () => {
      seed()
      const original = session.form()
      expect(session.save()).toBe(true)
      flush()
      expect(session.form()).toBeDefined()
      flush()
      expect(session.form()).not.toBe(original)
      flush()
      expect(session.hasChanges()).toBe(true)
      dispose()
    }
  })())
