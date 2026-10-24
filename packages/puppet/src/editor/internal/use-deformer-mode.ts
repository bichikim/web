import {type Accessor, createEffect, createSignal} from 'solid-js'
import type {PuppetDocument} from '../../player'
import type {DeformerEditMode} from './DeformerMode'
import {isDeformerRestEditable, preserveDeformerPlacement} from './deformer-placement'

interface DeformerModeOptions {
  readonly document: Accessor<PuppetDocument>
  readonly nodeId: Accessor<string | undefined>
  readonly onDocumentChange: (document: PuppetDocument) => void
}

export const useDeformerMode = (options: DeformerModeOptions) => {
  const [mode, setMode] = createSignal<DeformerEditMode>('pose')
  createEffect(() => {
    if (mode() === 'rest' && !isDeformerRestEditable(options.document(), options.nodeId() ?? '')) {
      setMode('pose')
    }
  })
  return {
    mode,
    setMode,
    updateInspector: (document: PuppetDocument) =>
      options.onDocumentChange(
        mode() === 'rest'
          ? preserveDeformerPlacement(options.document(), document, options.nodeId())
          : document,
      ),
  }
}
