import type {PuppetVertexReference} from './document'

export interface PuppetEdgeReference extends PuppetVertexReference {
  readonly edge: {readonly endIndex: number; readonly position: number}
}

export interface PuppetGlue {
  /** 연결 순서대로 공유 정점을 계산한다. 생략하면 기존 정점 독점 규칙을 사용한다. */
  readonly composition?: 'sequential'
  readonly id: string
  readonly first: PuppetVertexReference
  readonly second: PuppetVertexReference | PuppetEdgeReference
  /** B's share of the joined position, from zero to one. */
  readonly weight: number
  readonly strength: number
}
