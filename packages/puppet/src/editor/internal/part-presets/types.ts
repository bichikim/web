import type {PuppetDocument, PuppetPart} from '../../../player'

export interface PartPresetPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly part: PuppetPart
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

export interface PresetSectionProps extends PartPresetPropertiesProps {
  readonly apply: (document: PuppetDocument | undefined) => boolean
  readonly disabled: boolean
}
