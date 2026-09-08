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

export const PUPPET_PART_BLEND_MODES = ['normal', 'add', 'multiply', 'screen'] as const

export type PuppetPartBlendMode = (typeof PUPPET_PART_BLEND_MODES)[number]
export type PuppetColor = readonly [number, number, number]

export interface PuppetPartRenderProperties {
  readonly blendMode?: PuppetPartBlendMode
  readonly clippingMaskIds?: ReadonlyArray<string>
  readonly invertedMask?: boolean
  readonly multiplyColor?: PuppetColor
  readonly opacity?: number
  readonly renderWhenUsedAsMask?: boolean
  readonly screenColor?: PuppetColor
}

export interface PuppetPart {
  readonly id: string
  readonly mesh: PuppetMesh
  readonly properties?: PuppetPartRenderProperties
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

export interface PuppetDeformerPin extends PuppetPoint {
  readonly radius: number
  readonly strength: number
}

export interface PuppetVertexReference {
  readonly partId: string
  readonly vertexIndex: number
}

export interface PuppetBoneWeights extends PuppetVertexReference {
  /** Weights for consecutive segments, normalized for multiple bones. A single bone blends with the input position; omission uses distance-based weights. */
  readonly weights: ReadonlyArray<number>
}

export interface PuppetVertexInfluence extends PuppetVertexReference {
  readonly weight: number
}

export interface PuppetDeformerShape {
  /** A rigid pivot and direction handle represented by exactly one bone segment. */
  readonly deformerType?: 'rotation'
  /** Per-vertex deformation amount; omission applies the full deformation. */
  readonly vertexInfluences?: ReadonlyArray<PuppetVertexInfluence>
  readonly boneWeights?: ReadonlyArray<PuppetBoneWeights>
  readonly pins?: ReadonlyArray<PuppetDeformerPin>
  /** Bind joints of a connected bone chain, packed as XY pairs. Control points store posed joints. */
  readonly boneRestPoints?: ReadonlyArray<number>
  /** Cubic centerline with shared endpoints: start, outgoing handle, incoming handle, end, then successive handle pairs and endpoints. */
  readonly curveBreaks?: ReadonlyArray<number>
  readonly curveAxis?: 'x' | 'y'
  readonly bounds: {
    readonly height: number
    readonly width: number
    readonly x: number
    readonly y: number
  }
  readonly columns: number
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly rotationOrigin?: PuppetPoint
  readonly rows: number
}

export interface PuppetDeformerBindingStep {
  readonly shape: PuppetDeformerShape
  readonly rest?: PuppetDeformerShape
}

export interface PuppetDeformerBinding {
  readonly rest: PuppetDeformerShape
  readonly steps: ReadonlyArray<PuppetDeformerBindingStep>
}

export interface PuppetSceneDeformerNode extends PuppetSceneContainerNodeBase, PuppetDeformerShape {
  readonly kind: 'deformer'
  /** Preserved deformation followed by the current control layout's bind mapping. */
  readonly binding?: PuppetDeformerBinding
}

export interface PuppetSkinMatrix {
  readonly xx: number
  readonly yx: number
  readonly xy: number
  readonly yy: number
  readonly x: number
  readonly y: number
}

export interface PuppetSkinInfluence {
  readonly strength?: number
  readonly nodeId: string
  readonly inverseBind: PuppetSkinMatrix
  readonly weights: ReadonlyArray<number>
}

export interface PuppetSkinOptions {
  readonly mode?: 'joint' | 'smooth'
  readonly range?: number
}

export interface PuppetSkinBinding extends PuppetSkinOptions {
  readonly syncSeams?: boolean
  readonly bind: PuppetSkinMatrix
  readonly influences: ReadonlyArray<PuppetSkinInfluence>
}

export interface PuppetScenePartNode extends PuppetSceneNodeBase {
  readonly skinning?: PuppetSkinBinding
  readonly kind: 'part'
}

export type PuppetSceneContainerNode = PuppetSceneDeformerNode | PuppetSceneGroupNode

export type PuppetSceneNode = PuppetSceneContainerNode | PuppetScenePartNode

export interface PuppetScene {
  readonly roots: ReadonlyArray<PuppetSceneNode>
}

export interface PuppetParameterPartKeyform {
  readonly partId: string
  readonly properties?: Pick<
    PuppetPartRenderProperties,
    'multiplyColor' | 'opacity' | 'screenColor'
  >
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetParameterDeformerKeyform {
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly kind: 'deformer'
  readonly nodeId: string
  readonly rotationOrigin?: PuppetPoint
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

export interface PuppetInfluencePoint {
  readonly value: number
  readonly weight: number
}

export interface PuppetParameterInfluence {
  readonly parameterId: string
  readonly points: ReadonlyArray<PuppetInfluencePoint>
}

export interface PuppetParameterBindingBase {
  readonly influences?: ReadonlyArray<PuppetParameterInfluence>
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

export interface PuppetDocument {
  readonly glue?: ReadonlyArray<PuppetGlue>
  readonly format: typeof PUPPET_DOCUMENT_FORMAT
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly parameterBindings?: ReadonlyArray<PuppetParameterBinding>
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly scene?: PuppetScene
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}
