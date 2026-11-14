import type {JSX} from 'solid-js'
import type {UseMeshEditorResult} from '../use-mesh-editor'

export interface MeshBrushControlsProps {
  readonly editor: UseMeshEditorResult
  readonly modeControls?: JSX.Element
}
