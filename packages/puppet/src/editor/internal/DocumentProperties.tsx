import type {PuppetDocument} from '../../player'
import {DocumentLayoutProperties} from './DocumentLayoutProperties'
import {BREATH_EFFECT, LOOK_EFFECT} from './parameter-effects'
import {ParameterEffectProperties} from './ParameterEffectProperties'

export interface DocumentPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

/** Whole-document settings shown when nothing is selected: framing, breathing and look. */
export const DocumentProperties = (props: DocumentPropertiesProps) => (
  <>
    <DocumentLayoutProperties {...props} />
    <ParameterEffectProperties {...props} effect={BREATH_EFFECT} />
    <ParameterEffectProperties {...props} effect={LOOK_EFFECT} />
  </>
)
