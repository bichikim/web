import {createRoot, createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument, parseDocumentValue, type PuppetDocument} from '../../../player'
import {addGlue} from '../glue'
import {useGlueEditor} from '../use-glue-editor'

const document = (): PuppetDocument => ({
  ...addGlue(
    createDemoDocument(),
    {partId: 'mesh-preview', vertexIndex: 0},
    {partId: 'shape-diamond', vertexIndex: 0},
  )!,
  parameterBindings: [
    {
      id: 'join',
      keyforms: [-30, 30].map((value) => ({
        glue: [{id: 'glue-1', strength: (value + 30) / 60, weight: 0.5}],
        parts: [],
        values: [value],
      })),
      parameterIds: ['angle-x'],
      targetGlueIds: ['glue-1'],
    },
  ],
})

test('should edit the direct Glue keyform through the panel without changing base Glue', () => {
  createRoot((dispose) => {
    try {
      const source = document()
      const onDocumentChange = vi.fn()
      const onKeyformChange = vi.fn()
      const editor = useGlueEditor({
        activeBindingId: 'join',
        activeKeyformValues: [-30],
        document: source,
        editMode: 'parameter',
        onDocumentChange,
        onKeyformChange,
        partId: 'mesh-preview',
      })
      const glue = source.glue![0]!
      expect(editor.hasParameter(glue)).toBe(true)
      expect(editor.canEdit(glue)).toBe(true)
      expect(editor.sampled(glue).strength).toBe(0)
      editor.change(glue, {strength: 0.2, weight: 0.7})
      expect(onDocumentChange).not.toHaveBeenCalled()
      expect(onKeyformChange).toHaveBeenCalledOnce()
      const updated = onKeyformChange.mock.calls[0]![0] as PuppetDocument
      expect(updated.glue).toEqual(source.glue)
      expect(updated.parameterBindings![0]!.keyforms[0]!.glue).toEqual([
        {id: 'glue-1', strength: 0.2, weight: 0.7},
      ])
      expect(parseDocumentValue(updated).ok).toBe(true)
    } finally {
      dispose()
    }
  })
})

test('should follow binding selection and prevent base edits when no direct keyform is active', () => {
  createRoot((dispose) => {
    try {
      const source = document()
      const [selected, setSelected] = createSignal<string | undefined>()
      const onDocumentChange = vi.fn()
      const onKeyformChange = vi.fn()
      const editor = useGlueEditor({
        get activeBindingId() {
          return selected()
        },
        activeKeyformValues: [-30],
        document: source,
        editMode: 'parameter',
        onDocumentChange,
        onKeyformChange,
        partId: 'mesh-preview',
      })
      const glue = source.glue![0]!
      expect(editor.canEdit(glue)).toBe(false)
      editor.change(glue, {strength: 0.2, weight: 0.7})
      expect(onDocumentChange).not.toHaveBeenCalled()
      expect(onKeyformChange).not.toHaveBeenCalled()
      setSelected('join')
      expect(editor.canEdit(glue)).toBe(true)
      expect(editor.sampled(glue).strength).toBe(0)
      setSelected(undefined)
      expect(editor.canEdit(glue)).toBe(false)
    } finally {
      dispose()
    }
  })
})
