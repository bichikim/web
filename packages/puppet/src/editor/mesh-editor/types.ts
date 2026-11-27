import {type JSX} from '@solidjs/web'
import type {UseMeshEditorResult} from '../use-mesh-editor'

export interface MeshBrushControlsProps {
  readonly editor: UseMeshEditorResult
  readonly modeControls?: JSX.Element
}
