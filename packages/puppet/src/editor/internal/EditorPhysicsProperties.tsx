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
  readonly physicsPreview?: boolean
  readonly onPhysicsPreviewChange?: (enabled: boolean) => void
  readonly onPhysicsReset?: () => void
}

export interface EditorPhysicsPropertiesProps {
  readonly inputParameterIds?: ReadonlyArray<string>
  readonly source: EditorPhysicsPropertiesSource
}

export const EditorPhysicsProperties = (props: EditorPhysicsPropertiesProps) => (
  <PhysicsProperties
    disabled={props.source.editingDisabled || props.source.editMode === 'motion'}
    document={props.source.physicsDocument ?? props.source.document}
    inputParameterIds={props.inputParameterIds}
    onDocumentChange={props.source.onPhysicsDocumentChange ?? props.source.onDocumentChange}
    onEditEnd={props.source.onEditEnd}
    onEditStart={props.source.onEditStart}
    physicsPreview={props.source.physicsPreview}
    onPhysicsPreviewChange={props.source.onPhysicsPreviewChange}
    onPhysicsReset={props.source.onPhysicsReset}
  />
)
