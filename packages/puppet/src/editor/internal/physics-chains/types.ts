import type {PuppetDocument, PuppetPhysicsChain} from '../../../player'

export interface PhysicsChainsSectionProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly inputParameterIds?: ReadonlyArray<string>
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

export interface ChainProps {
  readonly chain: PuppetPhysicsChain
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly update: (change: (chain: PuppetPhysicsChain) => PuppetPhysicsChain) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}
