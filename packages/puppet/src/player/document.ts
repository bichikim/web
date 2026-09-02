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

export interface PuppetPoint {
  readonly x: number
  readonly y: number
}

export interface PuppetDeformerCurveHandle {
  readonly horizontal: PuppetPoint
  readonly pointIndex: number
  readonly vertical: PuppetPoint
}

export interface PuppetSceneContainerNodeBase extends PuppetSceneNodeBase {
  readonly children: ReadonlyArray<PuppetSceneNode>
}

export interface PuppetSceneGroupNode extends PuppetSceneContainerNodeBase {
  readonly kind: 'group'
}

export interface PuppetSceneDeformerNode extends PuppetSceneContainerNodeBase {
  readonly bounds: {
    readonly height: number
    readonly width: number
    readonly x: number
    readonly y: number
  }
  readonly columns: number
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly kind: 'deformer'
  readonly rows: number
}

export interface PuppetScenePartNode extends PuppetSceneNodeBase {
  readonly kind: 'part'
}

export type PuppetSceneContainerNode = PuppetSceneDeformerNode | PuppetSceneGroupNode

export type PuppetSceneNode = PuppetSceneContainerNode | PuppetScenePartNode

export interface PuppetScene {
  readonly roots: ReadonlyArray<PuppetSceneNode>
}

export interface PuppetParameterPartKeyform {
  readonly partId: string
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetParameterDeformerKeyform {
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly kind: 'deformer'
  readonly nodeId: string
}

export interface PuppetParameterKeyformBase {
  readonly deformers?: ReadonlyArray<PuppetParameterDeformerKeyform>
  readonly parts: ReadonlyArray<PuppetParameterPartKeyform>
}

export interface PuppetParameter {
  readonly defaultValue: number
  readonly id: string
  readonly maximum: number
  readonly minimum: number
  readonly name: string
}

export interface PuppetParameterKeyform1D extends PuppetParameterKeyformBase {
  readonly values: readonly [number]
}

export interface PuppetParameterKeyform2D extends PuppetParameterKeyformBase {
  readonly values: readonly [number, number]
}

export type PuppetParameterKeyform = PuppetParameterKeyform1D | PuppetParameterKeyform2D

export interface PuppetParameterBindingBase {
  readonly id: string
  readonly targetDeformerIds?: ReadonlyArray<string>
  readonly targetPartIds?: ReadonlyArray<string>
}

export interface PuppetParameterBinding1D extends PuppetParameterBindingBase {
  readonly keyforms: ReadonlyArray<PuppetParameterKeyform1D>
  readonly parameterIds: readonly [string]
}

export interface PuppetParameterBinding2D extends PuppetParameterBindingBase {
  readonly keyforms: ReadonlyArray<PuppetParameterKeyform2D>
  readonly parameterIds: readonly [string, string]
}

export type PuppetParameterBinding = PuppetParameterBinding1D | PuppetParameterBinding2D

export interface PuppetKeyframe {
  /** Applies from this keyframe to the next keyframe in the track. */
  readonly easing?: PuppetEasing
  readonly time: number
  readonly value: number
}

export interface PuppetVertexTrack {
  readonly axis: PuppetTrackAxis
  readonly kind: 'vertex'
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly partId: string
  readonly vertexIndex: number
}

export interface PuppetParameterTrack {
  readonly kind: 'parameter'
  readonly keyframes: ReadonlyArray<PuppetKeyframe>
  readonly parameterId: string
}

export type PuppetTrack = PuppetParameterTrack | PuppetVertexTrack

export interface PuppetMotion {
  readonly duration: number
  readonly id: string
  readonly tracks: ReadonlyArray<PuppetTrack>
}

export interface PuppetDocument {
  readonly format: typeof PUPPET_DOCUMENT_FORMAT
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly parameterBindings?: ReadonlyArray<PuppetParameterBinding>
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly scene?: PuppetScene
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}
