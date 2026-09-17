import type {PuppetDocument} from '../../player'
import {PhysicsProperties} from './PhysicsProperties'

export interface EditorPhysicsPropertiesSource {
  readonly editingDisabled?: boolean
  readonly editMode?: 'motion' | 'parameter'
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onPhysicsDocumentChange?: (document: PuppetDocument) => void
  readonly physicsDocument?: PuppetDocument
}

export interface EditorPhysicsPropertiesProps {
  readonly source: EditorPhysicsPropertiesSource
}

export const EditorPhysicsProperties = (props: EditorPhysicsPropertiesProps) => (
  <PhysicsProperties
    disabled={props.source.editingDisabled || props.source.editMode === 'motion'}
    document={props.source.physicsDocument ?? props.source.document}
    onDocumentChange={props.source.onPhysicsDocumentChange ?? props.source.onDocumentChange}
    onEditEnd={props.source.onEditEnd}
    onEditStart={props.source.onEditStart}
  />
)
