export const PUPPET_DOCUMENT_FORMAT = 'winter-love-puppet'
export const PUPPET_DOCUMENT_VERSION = 1

export const PUPPET_EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const

export type PuppetTrackAxis = 'x' | 'y'
export type PuppetEasing = (typeof PUPPET_EASINGS)[number]

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

export interface PuppetSceneNodeBase {
  readonly id: string
  readonly locked: boolean
  readonly name: string
  readonly visible: boolean
}

export interface PuppetSceneGroupNode extends PuppetSceneNodeBase {
  readonly children: ReadonlyArray<PuppetSceneNode>
  readonly kind: 'group'
}

export interface PuppetScenePartNode extends PuppetSceneNodeBase {
  readonly kind: 'part'
}

export type PuppetSceneNode = PuppetSceneGroupNode | PuppetScenePartNode

export interface PuppetScene {
  readonly roots: ReadonlyArray<PuppetSceneNode>
}

export interface PuppetParameterPartKeyform {
  readonly partId: string
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetParameterKeyform {
  readonly parts: ReadonlyArray<PuppetParameterPartKeyform>
  readonly value: number
}

export interface PuppetParameter {
  readonly defaultValue: number
  readonly id: string
  readonly keyforms: ReadonlyArray<PuppetParameterKeyform>
  readonly maximum: number
  readonly minimum: number
  readonly name: string
  readonly targetPartIds?: ReadonlyArray<string>
}

export interface PuppetKeyframe {
  /** Applies from this keyframe to the next keyframe in the track. */
  readonly easing?: PuppetEasing
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
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly scene?: PuppetScene
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}
