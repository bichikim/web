import type {PuppetParameterValues} from '../../../deformation'
import type {PuppetDocument, PuppetSceneGroupNode} from '../../../player'
import type {createGroupPropertiesController} from './create-group-properties-controller'

export interface GroupPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly group: PuppetSceneGroupNode
  /** The selected keyform of the active parameter, where keyed opacity and colors are edited. */
  readonly keyform?: {readonly bindingId: string; readonly values: PuppetParameterValues}
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

export type GroupPropertiesController = ReturnType<typeof createGroupPropertiesController>
