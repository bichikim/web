import type {DeformerEditMode} from '../internal/DeformerMode'
import type {JSX} from 'solid-js'
import type {PuppetParameterValueMap, PuppetParameterValues} from '../../deformation'
import type {Player, PuppetDocument} from '../../player'
import type {DeformerControlSelection} from '../internal/deformer-control-selection'
import type {PlayerCanvasStatus} from '../PlayerCanvas'

export interface EditorViewportProps {
  /** Hides previous editing overlays while a new selection is prepared; omitted to show them normally. */
  readonly selectionPending?: boolean
  readonly brushControlsMount?: HTMLDivElement
  readonly brushSettingsMount?: HTMLDivElement
  readonly physicsPreview?: boolean
  readonly meshEditingDisabled?: boolean
  readonly motionId?: string
  readonly onMeshEditingStart?: () => void
  readonly onRestDocumentChange?: (document: PuppetDocument) => void
  readonly fitRevision?: number
  readonly overlay?: JSX.Element
  readonly sourceDocument?: PuppetDocument
  readonly deformerMode?: DeformerEditMode
  readonly onDeformerModeChange?: (mode: DeformerEditMode) => void
  readonly renderEditingControls?: (controls: JSX.Element) => JSX.Element
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activePartId?: string
  readonly activeNodeId?: string
  readonly activeVertexIndex?: number | null
  readonly currentTime?: number
  readonly deformerControlSelection: DeformerControlSelection
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDeformerEditEnd?: () => void
  readonly onDeformerEditStart?: () => void
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onNotice?: (message: string | null) => void
  readonly onPlayerChange?: (player: Player | null) => void
  readonly onStatusChange?: (status: PlayerCanvasStatus) => void
  readonly onTimeChange?: (time: number) => void
  readonly onVertexEditStart?: () => void
  readonly onVertexSelect?: (vertexIndex: number | null) => void
  readonly playbackActive?: boolean
  readonly parameterValues?: PuppetParameterValues
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly previewDocument?: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetNodeIds?: ReadonlyArray<string>
}
