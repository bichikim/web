export const PUPPET_DOCUMENT_FORMAT = 'winter-love-puppet'
export const PUPPET_DOCUMENT_VERSION = 1

export type PuppetTrackAxis = 'x' | 'y'

export interface PuppetViewport {
  readonly width: number
  readonly height: number
}

export interface PuppetTexture {
  readonly height: number
  readonly src: string
  readonly width: number
}

export interface PuppetMesh {
  readonly boundaryLoops?: ReadonlyArray<ReadonlyArray<number>>
  readonly indices: ReadonlyArray<number>
  readonly uvs: ReadonlyArray<number>
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetPart {
  readonly id: string
  readonly mesh: PuppetMesh
  readonly texture: PuppetTexture
}

export interface PuppetKeyframe {
  readonly time: number
  readonly value: number
}

export interface PuppetTrack {
  readonly axis: PuppetTrackAxis
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly partId: string
  readonly vertexIndex: number
}

export interface PuppetMotion {
  readonly duration: number
  readonly id: string
  readonly tracks: ReadonlyArray<PuppetTrack>
}

export interface PuppetDocument {
  readonly format: typeof PUPPET_DOCUMENT_FORMAT
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}
