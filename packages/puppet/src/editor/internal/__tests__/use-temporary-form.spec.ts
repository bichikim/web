import {addGlue, setGlueKeyform} from '../glue'
/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
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
    const onChange = vi.fn()
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
    edit()
    const first = session.form()!.parts[0]!.vertices[0]!
    edit()
    expect(session.form()!.parts[0]!.vertices[0]).toBe(first + 10)
    expect(onChange).not.toHaveBeenCalled()
    session.hide()
    setNode('shape-diamond')
    expect(session.form()).toBeUndefined()
    setNode(nodeId)
    expect(session.form()).toBeDefined()
    expect(session.showing()).toBe(false)
    setValues([30, 0])
    setKey([30, 0])
    session.setPreview(true)
    expect(session.showing()).toBe(true)
    session.setPreview(false)
    expect(session.showing()).toBe(false)
    expect(session.save()).toBe(true)
    expect(onChange).toHaveBeenCalledOnce()
    expect(session.form()).toBeUndefined()
    dispose()
  }))

test('should preserve ordinary part properties without committing the temporary key', () =>
  createRoot((dispose) => {
    const document = createDemoDocument()
    const binding = document.parameterBindings![0]!
    const nodeId = binding.keyforms[0]!.parts[0]!.partId
    const onChange = vi.fn()
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
    session.update({...working, parts})
    expect(session.form()).toBeUndefined()
    expect(onChange.mock.calls[0]![0].parameterBindings).toBe(document.parameterBindings)
    expect(onChange.mock.calls[0]![0].parts[0].properties.blendMode).toBe('screen')
    dispose()
  }))

test('should retain Glue as a temporary form until explicitly saved to a selected key', () =>
  createRoot((dispose) => {
    const source = addGlue(
      createDemoDocument(),
      {partId: 'mesh-preview', vertexIndex: 0},
      {partId: 'shape-diamond', vertexIndex: 0},
    )!
    const [key, setKey] = createSignal<readonly [number, number] | null>(null)
    const onChange = vi.fn()
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
    session.update(
      setGlueKeyform({...target, changes: {strength: 0.4, weight: 0.5}, glueId: 'glue-1'})!,
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(session.form()!.parts[0]!.glue).toEqual([{id: 'glue-1', strength: 0.4, weight: 0.5}])
    setKey([30, 0])
    expect(session.save()).toBe(true)
    const saved = onChange.mock.calls[0]![0]
    expect(
      saved.parameterBindings[0].keyforms.find(
        (form: {values: number[]}) => form.values[0] === 30 && form.values[1] === 0,
      ).parts[0].glue,
    ).toEqual([{id: 'glue-1', strength: 0.4, weight: 0.5}])
    expect(saved.glue[0].strength).toBe(1)
    dispose()
  }))
