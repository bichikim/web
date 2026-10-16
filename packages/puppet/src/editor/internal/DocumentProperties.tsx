import type {PuppetDocument} from '../../player'
import {BreathProperties} from './BreathProperties'
import {DocumentLayoutProperties} from './DocumentLayoutProperties'
import {LookProperties} from './LookProperties'

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
    <BreathProperties {...props} />
    <LookProperties {...props} />
  </>
)
