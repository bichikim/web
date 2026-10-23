import type {PuppetVertexReference} from './document'

export interface PuppetEdgeReference extends PuppetVertexReference {
  readonly edge: {readonly endIndex: number; readonly position: number}
}

export interface PuppetGlue {
  readonly id: string
  readonly first: PuppetVertexReference
  readonly second: PuppetVertexReference | PuppetEdgeReference
  /** B's share of the joined position, from zero to one. */
  readonly weight: number
  readonly strength: number
}
