import type {DeformerEditMode} from '../DeformerMode'
import type {JSX} from 'solid-js'
import type {PuppetParameterValues} from '../../../deformation'
import type {PuppetDocument} from '../../../player'
import type {DeformerControlSelection} from '../deformer-control-selection'

export interface DeformerEditorProps {
  readonly brushControlsExternal?: boolean
  readonly brushControlsMount?: HTMLDivElement
  readonly brushSettingsMount?: HTMLDivElement
  readonly deformerMode?: DeformerEditMode
  readonly onDeformerModeChange?: (mode: DeformerEditMode) => void
  readonly renderControls?: (controls: JSX.Element) => JSX.Element
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly controlSelection?: DeformerControlSelection
  readonly previewDocument?: PuppetDocument
  readonly targetNodeIds?: ReadonlyArray<string>
}
