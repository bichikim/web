export * from './document-glue'
import type {PuppetGlue} from './document-glue'
export * from './document-model'
export * from './document-motion'
export * from './document-physics'
export * from './document-render'
export * from './document-sampling'
import type {PuppetKeyformSampling, PuppetNumberPrecision} from './document-sampling'
import type {
  PuppetLayout,
  PuppetLookParameter,
  PuppetBreathParameter,
  PuppetMouthShapes,
  PuppetParameterGroup,
  PuppetParameterRoles,
} from './document-model'
import type {PuppetPhysics} from './document-physics'
import type {
  PuppetDeformerRenderProperties,
  PuppetGroupRenderProperties,
  PuppetPartRenderProperties,
} from './document-render'
import type {PuppetMotion} from './document-motion'
export const PUPPET_DOCUMENT_FORMAT = 'winter-love-poffo'
/** Earlier format names; parsing reads them as `PUPPET_DOCUMENT_FORMAT`. */
export const LEGACY_PUPPET_DOCUMENT_FORMATS: ReadonlyArray<string> = ['winter-love-puppet']
export const PUPPET_DOCUMENT_VERSION = 1
export const DEFAULT_PUPPET_FRAMES_PER_SECOND = 24
export const MAXIMUM_PUPPET_FRAMES_PER_SECOND = 240
export const MINIMUM_PUPPET_FRAMES_PER_SECOND = 1
/** Parameters a binding can key, Cubism's limit. */
export const MAX_PARAMETER_DIMENSIONS = 3
export const PUPPET_SPATIAL_OBJECT_MAX_DEPTH = 12

export const PUPPET_EXPRESSION_BLENDS = ['add', 'multiply', 'overwrite'] as const
/** Seconds, matching the Cubism expression default. */
export const DEFAULT_PUPPET_EXPRESSION_FADE_TIME = 1
/** Seconds, matching the Cubism pose default. */
export const DEFAULT_PUPPET_POSE_FADE_TIME = 0.5

export interface PuppetViewport {
  readonly width: number
  readonly height: number
}

/** A rectangle of whole pixels within a texture image. */
export interface PuppetTextureRegion {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

export interface PuppetTexture {
  readonly height: number
  /**
   * The part's own image within a texture shared with other parts (an atlas). UVs still address
   * the whole texture; the editor uses the region to give each part its image back.
   */
  readonly region?: PuppetTextureRegion
  readonly src: string
  readonly width: number
}

export interface PuppetMesh {
  /** Native compiled triangle meshes may overlap or collapse. Validate index connectivity; omission also validates planar rest geometry. */
  readonly validationSpace?: 'indices'
  readonly boundaryLoops?: ReadonlyArray<ReadonlyArray<number>>
  /** 빈 배열은 글루 연결점처럼 삼각형을 그리지 않는 메시를 나타낸다. */
  readonly indices: ReadonlyArray<number>
  readonly uvs: ReadonlyArray<number>
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetPsdSource {
  readonly documentId?: string
  readonly fileName?: string
  readonly layerId?: number
  readonly path: ReadonlyArray<string>
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PuppetPart {
  readonly psdSource?: PuppetPsdSource
  readonly id: string
  readonly mesh: PuppetMesh
  readonly properties?: PuppetPartRenderProperties
  readonly spatial?: PuppetSpatialSurface
  readonly texture: PuppetTexture
  /** Free text for apps, such as a hit reaction name (Cubism's userdata3). */
  readonly userData?: string
}

export interface PuppetSpatialSurface {
  /** Barycentric links from image vertices to triangles of the grouped 3D mesh. */
  readonly attachments?: ReadonlyArray<PuppetSpatialAttachment>
  /** XYZ triples in the same order as the image mesh vertices. Positive Z faces the viewer. */
  readonly controlPoints: ReadonlyArray<number>
  /** Faces with the same group ID share depth ordering while other scene layers keep their order. */
  readonly groupId?: string
  readonly origin: readonly [number, number, number]
}

export interface PuppetSpatialAttachment {
  readonly triangleIndex: number
  readonly weights: readonly [number, number, number]
  readonly offset: readonly [number, number, number]
}

export interface PuppetSpatialPrimitive {
  readonly center: readonly [number, number, number]
  readonly id: string
  readonly mode: 'add' | 'intersect' | 'smooth-add' | 'subtract'
  readonly shape: 'box' | 'cylinder' | 'prism' | 'sphere'
  readonly size: readonly [number, number, number]
  readonly smoothness?: number
}

export interface PuppetSpatialObjectBase {
  readonly id: string
  readonly mode: PuppetSpatialPrimitive['mode']
  readonly name: string
  readonly smoothness?: number
  readonly visible: boolean
}

export interface PuppetSpatialPrimitiveObject extends PuppetSpatialObjectBase {
  readonly kind: 'primitive'
  readonly center: readonly [number, number, number]
  readonly rotation: readonly [number, number, number]
  readonly shape: PuppetSpatialPrimitive['shape']
  readonly size: readonly [number, number, number]
  readonly smoothness?: number
}

export interface PuppetSpatialMeshObject extends PuppetSpatialObjectBase {
  readonly kind: 'mesh'
  readonly center: readonly [number, number, number]
  readonly rotation: readonly [number, number, number]
  readonly size: readonly [number, number, number]
  readonly vertices: ReadonlyArray<number>
  readonly indices: ReadonlyArray<number>
}

export interface PuppetSpatialGroupObject extends PuppetSpatialObjectBase {
  readonly kind: 'group'
  readonly children: ReadonlyArray<PuppetSpatialObject>
  readonly smoothness?: number
}

export type PuppetSpatialObject =
  | PuppetSpatialPrimitiveObject
  | PuppetSpatialMeshObject
  | PuppetSpatialGroupObject

export interface PuppetSpatialMesh {
  readonly indices: ReadonlyArray<number>
  readonly source:
    | {
        readonly kind: 'generated'
        readonly operations: ReadonlyArray<PuppetSpatialPrimitive>
        readonly resolution: number
      }
    | {
        readonly kind: 'authored'
        readonly objects: ReadonlyArray<PuppetSpatialObject>
        readonly resolution: number
      }
    | {readonly kind: 'imported'; readonly name: string}
  /** XYZ triples in document coordinates. */
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetSceneNodeBase {
  /** All mapped intervals must contain the parameter value. Omission keeps static visibility. */
  readonly parameterVisibility?: ReadonlyArray<PuppetParameterVisibility>
  readonly id: string
  readonly locked: boolean
  readonly name: string
  readonly visible: boolean
}

export interface PuppetPoint {
  readonly x: number
  readonly y: number
}

export interface PuppetParameterVisibility {
  readonly parameterId: string
  readonly minimum: number
  readonly maximum: number
  /** Input precision; omission keeps Float64. */
  readonly precision?: 'float32' | 'float64'
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
  readonly properties?: PuppetGroupRenderProperties
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
  /** Unwrapped local X-axis angle in radians for a rotation deformer. Omission derives the shortest angle from its handle. */
  readonly rotationAngle?: number
  /** Signed local distance used to derive a parent-space rotation frame; defaults to 0.1. */
  readonly rotationReferenceDistance?: number
  /** 회전 전 로컬 X/Y 축의 반전. 생략하면 반전하지 않는다. */
  readonly rotationReflection?: readonly [boolean, boolean]
  /** 워프 셀의 대각선으로 나눈 삼각형 보간. 생략하면 기존 곡면 보간을 쓴다. */
  readonly interpolation?: 'triangles' | 'triangles-mirrored' | 'bilinear'
  /**
   * Posed scale of a rotation deformer about its pivot (Cubism's rotation deformer scale), from
   * its keyforms' `rotationScale`; 1 when omitted.
   */
  readonly rotationScale?: number
  /** A rigid pivot and direction handle represented by exactly one bone segment. */
  readonly deformerType?: 'rotation' | 'spatial'
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
  /** 부모의 로컬 좌표로 저장한 Cubism 디포머. 생략하면 기존 문서 좌표 합성을 쓴다. */
  readonly coordinateSpace?: 'parent'
  readonly kind: 'deformer'
  readonly properties?: PuppetDeformerRenderProperties
  readonly spatialMesh?: PuppetSpatialMesh
  readonly spatialMeshPosition?: readonly [number, number, number]
  readonly spatialOrigin?: readonly [number, number, number]
  readonly spatialRotation?: readonly [number, number, number]
  readonly spatialScale?: readonly [number, number, number]
  readonly spatialTranslation?: readonly [number, number, number]
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

export interface PuppetGlueKeyform {
  readonly id: string
  readonly strength: number
  readonly weight: number
}

export interface PuppetParameterPartKeyform {
  readonly glue?: ReadonlyArray<PuppetGlueKeyform>
  readonly partId: string
  readonly properties?: Pick<
    PuppetPartRenderProperties,
    'drawOrder' | 'multiplyColor' | 'opacity' | 'screenColor'
  >
  readonly vertices: ReadonlyArray<number>
}

export interface PuppetParameterDeformerKeyform {
  /** Unwrapped local X-axis angle in radians. Omission retains handle-based interpolation. */
  readonly rotationAngle?: number
  /** 낮은 키폼의 회전 로컬 축 반전. 다음 키에서 전환하며, 생략하면 장면의 반전값을 유지한다. */
  readonly rotationReflection?: readonly [boolean, boolean]
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly kind: 'deformer'
  readonly nodeId: string
  /** Keyed opacity and colors. */
  readonly properties?: PuppetDeformerRenderProperties
  readonly rotationOrigin?: PuppetPoint
  /** 회전 중심의 양수 배율. 생략하면 장면의 기본 배율을 유지한다. */
  readonly rotationScale?: number
  readonly spatialOrigin?: readonly [number, number, number]
  readonly spatialMeshPosition?: readonly [number, number, number]
  readonly spatialRotation?: readonly [number, number, number]
  readonly spatialScale?: readonly [number, number, number]
  readonly spatialTranslation?: readonly [number, number, number]
}

/** Keyed opacity and colors of a scene group listed in the binding's `targetGroupIds`. */
export interface PuppetParameterGroupKeyform {
  readonly groupId: string
  readonly properties: Pick<
    PuppetGroupRenderProperties,
    'drawOrder' | 'multiplyColor' | 'opacity' | 'screenColor'
  >
}

export interface PuppetParameterKeyformBase {
  /** 파트와 독립적으로 연결한 Glue 값. 생략하면 파트 안의 기존 Glue 키폼을 사용한다. */
  readonly glue?: ReadonlyArray<PuppetGlueKeyform>
  readonly deformers?: ReadonlyArray<PuppetParameterDeformerKeyform>
  /** One entry per `targetGroupIds` group. */
  readonly groups?: ReadonlyArray<PuppetParameterGroupKeyform>
  readonly parts: ReadonlyArray<PuppetParameterPartKeyform>
}

export interface PuppetParameter {
  readonly defaultValue: number
  /** Display group in `parameterGroups`. */
  readonly groupId?: string
  readonly id: string
  readonly maximum: number
  readonly minimum: number
  readonly name: string
  readonly options?: ReadonlyArray<PuppetParameterOption>
  /**
   * Wraps values into `minimum..maximum` instead of limiting them (Cubism's repeat): the
   * maximum equals the minimum, so a 1D binding's keyform at the maximum is ignored and its
   * last keyform below the maximum blends into its first one, one range later.
   */
  readonly repeat?: boolean
}

export interface PuppetParameterOption {
  readonly label: string
  readonly value: number
}

export interface PuppetParameterKeyform1D extends PuppetParameterKeyformBase {
  readonly values: readonly [number]
}

export interface PuppetParameterKeyform2D extends PuppetParameterKeyformBase {
  readonly values: readonly [number, number]
}

export interface PuppetParameterKeyform3D extends PuppetParameterKeyformBase {
  readonly values: readonly [number, number, number]
}

export type PuppetParameterKeyform =
  | PuppetParameterKeyform1D
  | PuppetParameterKeyform2D
  | PuppetParameterKeyform3D

export interface PuppetInfluencePoint {
  readonly value: number
  readonly weight: number
}

export interface PuppetParameterInfluence {
  readonly parameterId: string
  readonly points: ReadonlyArray<PuppetInfluencePoint>
}

export interface PuppetParameterBindingBase {
  /** 영향 곡선의 합성 방식. 생략하면 기존 최솟값 규칙을 사용한다. */
  readonly influenceMode?: 'minimum' | 'multiply'
  /** Additive samples may exceed display ranges; the composed properties are still clamped. */
  readonly keyformRange?: 'unbounded'
  /** 격자 샘플링의 축 정밀도와 키 경계 정책. 생략하면 기존 채널별 계산 방식을 유지한다. */
  readonly sampling?: PuppetKeyformSampling
  /** 직접 연결한 Glue ID. 생략하면 키폼의 직접 Glue와 기존 파트 연결에서 대상을 찾는다. */
  readonly targetGlueIds?: ReadonlyArray<string>
  /** 직교 격자 보간. 편집으로 비어 있는 모서리는 기본 형상을 쓴다. 생략하면 기존 산점 보간을 쓴다. */
  readonly interpolation?: 'grid'
  readonly influences?: ReadonlyArray<PuppetParameterInfluence>
  readonly id: string
  readonly name?: string
  readonly targetDeformerIds?: ReadonlyArray<string>
  /** Scene groups whose opacity and colors the keyforms set. */
  readonly targetGroupIds?: ReadonlyArray<string>
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

/**
 * Z 값별 XY 키폼을 독립적으로 저장한다. 각 단면을 2D로 표본화한 뒤 이웃 단면 사이를
 * 선형 보간하며, 세 번째 파라미터가 반복하면 마지막·첫 단면 사이도 순환한다.
 */
export interface PuppetParameterBinding3D extends PuppetParameterBindingBase {
  readonly keyforms: ReadonlyArray<PuppetParameterKeyform3D>
  readonly parameterIds: readonly [string, string, string]
}

export type PuppetParameterBinding =
  | PuppetParameterBinding1D
  | PuppetParameterBinding2D
  | PuppetParameterBinding3D

export interface PuppetLayerOrderCondition {
  /** Compare the sum of resolved parameter values against the strict threshold. */
  readonly parameterIds: ReadonlyArray<string>
  readonly comparison: 'greater-than' | 'less-than'
  readonly threshold: number
}

export interface PuppetLayerOrderRule {
  /** Move these parts together, retaining their current relative order. */
  readonly partIds: ReadonlyArray<string>
  readonly referencePartId: string
  /** Earlier parts paint behind later parts. */
  readonly placement: 'before' | 'after'
  readonly when: PuppetLayerOrderCondition
}

export type PuppetExpressionBlend = (typeof PUPPET_EXPRESSION_BLENDS)[number]

export interface PuppetExpressionParameter {
  /** `add` offsets, `multiply` scales and `overwrite` replaces the motion-mixed value. */
  readonly blend: PuppetExpressionBlend
  readonly parameterId: string
  readonly value: number
}

/** A named parameter preset applied over motions and under external overrides. */
export interface PuppetExpression {
  /** Cubism 프리셋의 사인 페이드와 전환 합성. 생략하면 기존 Poffo 합성을 유지한다. */
  readonly composition?: 'cubism'
  /** Seconds to reach full weight; defaults to `DEFAULT_PUPPET_EXPRESSION_FADE_TIME`. */
  readonly fadeInTime?: number
  /** Seconds to release; defaults to `DEFAULT_PUPPET_EXPRESSION_FADE_TIME`. */
  readonly fadeOutTime?: number
  readonly id: string
  readonly parameters: ReadonlyArray<PuppetExpressionParameter>
}

export interface PuppetPoseEntry {
  /** Parts shown together while this entry is selected. */
  readonly partIds: ReadonlyArray<string>
  /** Selector value; the entry nearest to the parameter value is selected. */
  readonly value: number
}

/** Mutually exclusive part sets, such as alternative arm poses, chosen by one parameter. */
export interface PuppetPoseGroup {
  /** Cubism 포즈 입력. 항목 순서대로 대응하며, 처음으로 0보다 큰 입력의 항목을 선택한다. 생략하면 parameterId의 선택값을 쓴다. */
  readonly sourceParameterIds?: ReadonlyArray<string>
  readonly entries: ReadonlyArray<PuppetPoseEntry>
  /** Seconds to cross-fade; defaults to `DEFAULT_PUPPET_POSE_FADE_TIME`. */
  readonly fadeTime?: number
  readonly id: string
  readonly parameterId: string
}

/** A named tap region covered by the deformed meshes of its parts, visible or not. */
export interface PuppetHitArea {
  readonly id: string
  readonly partIds: ReadonlyArray<string>
}

export interface PuppetDocument {
  /** Cubism combines inherited multiply and screen colors independently. Omission composes sequential color effects. */
  readonly colorComposition?: 'cubism'
  /** 모션 합성 결과의 정밀도. 생략하면 이전 프레임 모드는 기존 Float32, 나머지는 Float64를 유지한다. */
  readonly motionParameterPrecision?: PuppetNumberPrecision
  /** 모션의 페이드를 이전 모션 값에서 이어 계산한다. 생략하면 기본값을 기준으로 합성한다. */
  readonly motionParameterBase?: 'previous-frame'
  /** 같은 그리기 순서의 기준. 'parts'는 원본 메시 배열 순서, 생략하면 장면 순서를 따른다. */
  readonly drawOrderTieBreak?: 'parts'
  /** Cubism integer draw order: Float32 plus 0.001, then truncation. Omission keeps fractional orders. */
  readonly drawOrderRounding?: 'cubism'
  /** Automatic breathing, one entry per parameter. */
  readonly breath?: ReadonlyArray<PuppetBreathParameter>
  readonly expressions?: ReadonlyArray<PuppetExpression>
  readonly framesPerSecond?: number
  /** 공유 정점을 연결 순서대로 계산한다. 생략하면 기존 정점 독점 검증을 유지한다. */
  readonly glueComposition?: 'sequential'
  readonly glue?: ReadonlyArray<PuppetGlue>
  readonly hitAreas?: ReadonlyArray<PuppetHitArea>
  /** Default framing; the whole viewport when omitted. */
  readonly layout?: PuppetLayout
  /** Apply matching rules in array order, starting from scene order on every frame. */
  readonly layerOrderRules?: ReadonlyArray<PuppetLayerOrderRule>
  /** Parameters that follow where the model looks, one entry per parameter. */
  readonly look?: ReadonlyArray<PuppetLookParameter>
  readonly format: typeof PUPPET_DOCUMENT_FORMAT
  readonly motions: ReadonlyArray<PuppetMotion>
  /** Vowel mouth shapes for lip sync from audio. */
  readonly mouthShapes?: PuppetMouthShapes
  readonly parameterBindings?: ReadonlyArray<PuppetParameterBinding>
  readonly parameterGroups?: ReadonlyArray<PuppetParameterGroup>
  readonly parameterRoles?: PuppetParameterRoles
  readonly parameters?: ReadonlyArray<PuppetParameter>
  readonly parts: ReadonlyArray<PuppetPart>
  readonly physics?: PuppetPhysics
  /** Each group shows one entry's parts and hides the parts of its other entries. */
  readonly poseGroups?: ReadonlyArray<PuppetPoseGroup>
  readonly scene?: PuppetScene
  readonly version: typeof PUPPET_DOCUMENT_VERSION
  readonly viewport: PuppetViewport
}

export const getPuppetFramesPerSecond = (document: PuppetDocument) =>
  document.framesPerSecond ?? DEFAULT_PUPPET_FRAMES_PER_SECOND

/** The motion's own frame rate (Cubism's motion3 `Fps`), else the document's. */
export const getMotionFramesPerSecond = (document: PuppetDocument, motion?: PuppetMotion) =>
  motion?.framesPerSecond ?? getPuppetFramesPerSecond(document)
