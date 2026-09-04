import {createUniqueId, For, Show} from 'solid-js'

import {getPartRenderProperties, type PuppetParameterValues} from '../../deformation'
import {
  canUsePartAsMask,
  type PuppetDocument,
  type PuppetPart,
  type PuppetSceneDeformerNode,
  type PuppetSceneNode,
} from '../../player'
import {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerPoint,
} from './parameter-keyforms'
import {MAXIMUM_GRID_DIVISIONS, MINIMUM_GRID_DIVISIONS} from './grid-control-points'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  rotateDeformerControlPoints,
  rotateDeformerCurveHandles,
} from './deformer-transform'
import {getSceneNode, isSceneNodeLocked, resizeDeformer} from './scene-graph'
import type {SceneContainerConversionTarget} from './container-conversion'
import {addDeformerCurveHandle, removeDeformerCurveHandle} from './deformer-curve-handles'
import {setDeformerControlPoint, setDeformerControlPoints} from './deformer-control-points'
import {getParameterEditTarget} from './parameter-edit-target'
import {setParameterKeyformPartProperties, setPartRenderProperties} from './part-properties'
import {PartProperties} from './PartProperties'

const getMaskPartOptions = (document: PuppetDocument, partId: string) =>
  document.parts
    .filter((part) => part.id !== partId)
    .map((part) => ({
      disabled: !canUsePartAsMask({maskPartId: part.id, partId, parts: document.parts}),
      part,
    }))

export interface EditorInspectorProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly autoMeshAvailable?: boolean
  readonly containerConversionTarget?: SceneContainerConversionTarget
  readonly containerUnwrapAvailable?: boolean
  readonly notice?: string | null
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onAutoMesh?: () => void
  readonly onContainerConvert?: () => void
  readonly onContainerUnwrap?: () => void
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly previewDocument?: PuppetDocument
  readonly selectedControlPointIndices?: ReadonlyArray<number>
  readonly targetNodeIds?: ReadonlyArray<string>
}

interface DeformerNumberInputProps {
  readonly disabled?: boolean
  readonly label: string
  readonly maximum?: number
  readonly minimum?: number
  readonly name: string
  readonly onChange: (value: string) => void
  readonly step?: number | 'any'
  readonly value: number | undefined
}

const DeformerNumberInput = (props: DeformerNumberInputProps) => (
  <input
    aria-label={props.label}
    disabled={props.disabled}
    max={props.maximum}
    min={props.minimum}
    name={props.name}
    step={props.step ?? 'any'}
    type="number"
    value={props.value}
    onInput={(event) => props.onChange(event.currentTarget.value)}
  />
)

type TransformProperty = 'angle' | 'rotationOriginX' | 'rotationOriginY'

const getTransformedGeometry = (
  node: PuppetSceneDeformerNode,
  property: TransformProperty,
  value: number,
) => {
  const origin = getDeformerRotationOrigin(node)

  switch (property) {
    case 'angle': {
      const degrees = value - getDeformerAngle(node)
      return {
        controlPoints: rotateDeformerControlPoints({
          controlPoints: node.controlPoints,
          degrees,
          origin,
        }),
        curveHandles: rotateDeformerCurveHandles({
          curveHandles: node.curveHandles,
          degrees,
          origin,
        }),
        rotationOrigin: origin,
      }
    }
    case 'rotationOriginX': {
      return {
        controlPoints: node.controlPoints,
        curveHandles: node.curveHandles,
        rotationOrigin: {...origin, x: value},
      }
    }
    case 'rotationOriginY': {
      return {
        controlPoints: node.controlPoints,
        curveHandles: node.curveHandles,
        rotationOrigin: {...origin, y: value},
      }
    }
    default: {
      const exhaustiveProperty: never = property
      return exhaustiveProperty
    }
  }
}

const updateInspectorTransform = (
  props: EditorInspectorProps,
  node: PuppetSceneDeformerNode,
  property: TransformProperty,
  value: number,
) => {
  const geometry = getTransformedGeometry(node, property, value)
  const editTarget = getParameterEditTarget({
    activeBindingId: props.activeBindingId,
    activeKeyformValues: props.activeKeyformValues,
    editMode: props.editMode,
    nodeId: node.id,
    targetNodeIds: props.targetNodeIds,
  })

  if (editTarget.kind === 'rest') {
    return setDeformerControlPoints({...geometry, document: props.document, nodeId: node.id})
  }

  return setParameterKeyformDeformerControlPoints({
    bindingId: editTarget.bindingId,
    ...geometry,
    document: props.document,
    nodeId: node.id,
    values: editTarget.values,
  })
}

interface UpdateInspectorGridOptions {
  readonly axis: 'x' | 'y'
  readonly node: PuppetSceneDeformerNode
  readonly pointIndex: number
  readonly props: EditorInspectorProps
  readonly value: number
}

const updateInspectorGrid = (options: UpdateInspectorGridOptions) => {
  const x =
    options.axis === 'x' ? options.value : (options.node.controlPoints[options.pointIndex * 2] ?? 0)
  const y =
    options.axis === 'y'
      ? options.value
      : (options.node.controlPoints[options.pointIndex * 2 + 1] ?? 0)

  const editTarget = getParameterEditTarget({
    activeBindingId: options.props.activeBindingId,
    activeKeyformValues: options.props.activeKeyformValues,
    editMode: options.props.editMode,
    nodeId: options.node.id,
    targetNodeIds: options.props.targetNodeIds,
  })

  if (editTarget.kind === 'rest') {
    return setDeformerControlPoint({
      document: options.props.document,
      nodeId: options.node.id,
      pointIndex: options.pointIndex,
      x,
      y,
    })
  }

  return setParameterKeyformDeformerPoint({
    bindingId: editTarget.bindingId,
    document: options.props.document,
    nodeId: options.node.id,
    pointIndex: options.pointIndex,
    values: editTarget.values,
    x,
    y,
  })
}

interface TransformPropertiesProps {
  readonly disabled: boolean
  readonly node: PuppetSceneDeformerNode
  readonly onChange: (property: TransformProperty, value: string) => void
}

const TransformProperties = (props: TransformPropertiesProps) => (
  <fieldset class="deformer-properties">
    <legend>회전</legend>
    <label>
      각도
      <DeformerNumberInput
        disabled={props.disabled}
        label="자유 변형 각도"
        name="deformer-angle"
        value={getDeformerAngle(props.node)}
        onChange={(value) => props.onChange('angle', value)}
      />
    </label>
    <label>
      회전 중심 X
      <DeformerNumberInput
        disabled={props.disabled}
        label="자유 변형 회전 중심 X"
        name="deformer-rotation-origin-x"
        value={getDeformerRotationOrigin(props.node).x}
        onChange={(value) => props.onChange('rotationOriginX', value)}
      />
    </label>
    <label>
      회전 중심 Y
      <DeformerNumberInput
        disabled={props.disabled}
        label="자유 변형 회전 중심 Y"
        name="deformer-rotation-origin-y"
        value={getDeformerRotationOrigin(props.node).y}
        onChange={(value) => props.onChange('rotationOriginY', value)}
      />
    </label>
  </fieldset>
)

interface GridPropertiesProps {
  readonly node: PuppetSceneDeformerNode
  readonly resolutionEditingDisabled: boolean
  readonly onDivisionChange: (axis: 'columns' | 'rows', value: string) => void
}

const GridProperties = (props: GridPropertiesProps) => (
  <fieldset class="deformer-properties">
    <legend>격자</legend>
    <div class="grid-resolution">
      <label>
        가로 칸
        <DeformerNumberInput
          disabled={props.resolutionEditingDisabled}
          label="격자 가로 칸"
          maximum={MAXIMUM_GRID_DIVISIONS}
          minimum={MINIMUM_GRID_DIVISIONS}
          name="deformer-columns"
          step={1}
          value={props.node.columns}
          onChange={(value) => props.onDivisionChange('columns', value)}
        />
      </label>
      <label>
        세로 칸
        <DeformerNumberInput
          disabled={props.resolutionEditingDisabled}
          label="격자 세로 칸"
          maximum={MAXIMUM_GRID_DIVISIONS}
          minimum={MINIMUM_GRID_DIVISIONS}
          name="deformer-rows"
          step={1}
          value={props.node.rows}
          onChange={(value) => props.onDivisionChange('rows', value)}
        />
      </label>
    </div>
  </fieldset>
)

interface ControlPointPropertiesProps {
  readonly curveEditingDisabled: boolean
  readonly node: PuppetSceneDeformerNode
  readonly onCurveToggle: (pointIndex: number, hasHandle: boolean) => void
  readonly onPointChange: (pointIndex: number, axis: 'x' | 'y', value: string) => void
  readonly pointEditingDisabled: boolean
  readonly pointIndex: number
}

const ControlPointProperties = (props: ControlPointPropertiesProps) => {
  const hasHandle = () =>
    props.node.curveHandles?.some((handle) => handle.pointIndex === props.pointIndex) === true

  return (
    <fieldset class="deformer-properties grid-points">
      <legend>선택한 제어점 {props.pointIndex + 1}</legend>
      <div class="grid-point-row">
        <DeformerNumberInput
          disabled={props.pointEditingDisabled}
          label={`격자 제어점 ${props.pointIndex + 1} X`}
          name={`deformer-point-${props.pointIndex + 1}-x`}
          value={props.node.controlPoints[props.pointIndex * 2]}
          onChange={(value) => props.onPointChange(props.pointIndex, 'x', value)}
        />
        <DeformerNumberInput
          disabled={props.pointEditingDisabled}
          label={`격자 제어점 ${props.pointIndex + 1} Y`}
          name={`deformer-point-${props.pointIndex + 1}-y`}
          value={props.node.controlPoints[props.pointIndex * 2 + 1]}
          onChange={(value) => props.onPointChange(props.pointIndex, 'y', value)}
        />
        <button
          aria-label={`격자 제어점 ${props.pointIndex + 1} 곡률 핸들 ${hasHandle() ? '삭제' : '추가'}`}
          class="grid-curve-button"
          disabled={props.curveEditingDisabled}
          type="button"
          onClick={() => props.onCurveToggle(props.pointIndex, hasHandle())}
        >
          곡률 {hasHandle() ? '−' : '+'}
        </button>
      </div>
    </fieldset>
  )
}

interface SelectedControlPoint {
  readonly node: PuppetSceneDeformerNode
  readonly pointIndex: number
}

const getSelectedControlPoints = (
  node: PuppetSceneDeformerNode | undefined,
  indices: ReadonlyArray<number> | undefined,
): ReadonlyArray<SelectedControlPoint> =>
  node === undefined
    ? []
    : [...new Set(indices ?? [])].flatMap((pointIndex) =>
        pointIndex >= 0 && pointIndex < node.controlPoints.length / 2 ? [{node, pointIndex}] : [],
      )

const getActiveNode = (document: PuppetDocument, nodeId: string | undefined) =>
  nodeId === undefined ? undefined : getSceneNode(document, nodeId)

const getDeformerNode = (node: PuppetSceneNode | undefined) =>
  node?.kind === 'deformer' ? node : undefined

const createPartPropertiesController = (props: EditorInspectorProps) => {
  const getEditTarget = (partId: string) =>
    getParameterEditTarget({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      editMode: props.editMode,
      nodeId: partId,
      targetNodeIds: props.targetNodeIds,
    })
  const activePart = () => {
    const part = props.document.parts.find((candidate) => candidate.id === props.activeNodeId)
    if (part === undefined || getEditTarget(part.id).kind === 'rest') {
      return part
    }

    return props.previewDocument?.parts.find((candidate) => candidate.id === part.id) ?? part
  }
  const canEditRest = () =>
    props.activeNodeId !== undefined && !isSceneNodeLocked(props.document, props.activeNodeId)
  const canEditVisual = () => canEditRest() && props.editMode === 'parameter'
  const update = (
    part: PuppetPart,
    properties: Parameters<typeof setPartRenderProperties>[0]['properties'],
    interpolated: boolean,
  ) => {
    const editTarget = getEditTarget(part.id)
    const document =
      interpolated && editTarget.kind === 'keyform'
        ? setParameterKeyformPartProperties({
            bindingId: editTarget.bindingId,
            currentProperties: getPartRenderProperties(part),
            document: props.document,
            partId: part.id,
            properties: {
              ...properties,
            },
            values: editTarget.values,
          })
        : setPartRenderProperties({document: props.document, partId: part.id, properties})
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }

  return {activePart, canEditRest, canEditVisual, update}
}

export const EditorInspector = (props: EditorInspectorProps) => {
  const titleId = createUniqueId()
  const activeNode = () =>
    getActiveNode(props.previewDocument ?? props.document, props.activeNodeId)
  const deformerNode = () => getDeformerNode(activeNode())
  const partProperties = createPartPropertiesController(props)
  const canEditRestDeformer = () =>
    props.activeNodeId !== undefined && !isSceneNodeLocked(props.document, props.activeNodeId)
  const canEditDeformer = canEditRestDeformer
  const handleTransformChange = (property: TransformProperty, value: string) => {
    const node = activeNode()
    const number = Number(value)

    if (node?.kind !== 'deformer' || !Number.isFinite(number)) {
      return
    }

    const document = updateInspectorTransform(props, node, property, number)

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handleGridPointChange = (pointIndex: number, axis: 'x' | 'y', value: string) => {
    const node = activeNode()
    const number = Number(value)

    if (node?.kind !== 'deformer' || !Number.isFinite(number)) {
      return
    }

    const document = updateInspectorGrid({axis, node, pointIndex, props, value: number})

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handleGridDivisionChange = (axis: 'columns' | 'rows', value: string) => {
    const node = deformerNode()
    const divisions = Number(value)

    if (node === undefined || !Number.isInteger(divisions)) {
      return
    }

    const document = resizeDeformer({
      columns: axis === 'columns' ? divisions : node.columns,
      document: props.document,
      nodeId: node.id,
      rows: axis === 'rows' ? divisions : node.rows,
    })

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handleCurveToggle = (pointIndex: number, hasHandle: boolean) => {
    const node = deformerNode()
    if (node === undefined) {
      return
    }

    const document = hasHandle
      ? removeDeformerCurveHandle(props.document, node.id, pointIndex)
      : addDeformerCurveHandle(props.document, node.id, pointIndex)

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }

  return (
    <aside class="panel inspector-panel" aria-labelledby={titleId}>
      <div class="panel-heading">
        <h2 id={titleId}>선택 작업</h2>
      </div>
      <Show when={props.autoMeshAvailable && props.onAutoMesh !== undefined}>
        <section aria-label="파트 작업" class="selection-actions">
          <button type="button" onClick={() => props.onAutoMesh?.()}>
            자동 메시
          </button>
        </section>
      </Show>
      <Show
        when={
          (props.containerConversionTarget !== undefined &&
            props.onContainerConvert !== undefined) ||
          (props.containerUnwrapAvailable && props.onContainerUnwrap !== undefined)
        }
      >
        <section aria-label="컨테이너 작업" class="selection-actions">
          <Show when={props.containerConversionTarget}>
            {(targetKind) => (
              <button type="button" onClick={() => props.onContainerConvert?.()}>
                {targetKind() === 'deformer' ? '자유 변형 디포머로 변경' : '그룹으로 변경'}
              </button>
            )}
          </Show>
          <Show when={props.containerUnwrapAvailable && props.onContainerUnwrap !== undefined}>
            <button type="button" onClick={() => props.onContainerUnwrap?.()}>
              컨테이너 해제
            </button>
          </Show>
        </section>
      </Show>
      <Show keyed when={partProperties.activePart()}>
        {(part) => (
          <PartProperties
            maskPartOptions={getMaskPartOptions(props.document, part.id)}
            part={part}
            staticDisabled={!partProperties.canEditRest() || props.editMode !== 'parameter'}
            visualDisabled={!partProperties.canEditVisual()}
            onInterpolatedChange={(properties) =>
              partProperties.update(part, properties, props.editMode === 'parameter')
            }
            onStaticChange={(properties) => partProperties.update(part, properties, false)}
          />
        )}
      </Show>
      <Show keyed when={deformerNode()}>
        {(node) => (
          <TransformProperties
            disabled={!canEditDeformer()}
            node={node}
            onChange={handleTransformChange}
          />
        )}
      </Show>
      <Show keyed when={deformerNode()}>
        {(node) => (
          <GridProperties
            node={node}
            resolutionEditingDisabled={!canEditRestDeformer()}
            onDivisionChange={handleGridDivisionChange}
          />
        )}
      </Show>
      <For each={getSelectedControlPoints(deformerNode(), props.selectedControlPointIndices)}>
        {(selection) => (
          <ControlPointProperties
            curveEditingDisabled={!canEditRestDeformer()}
            node={selection.node}
            pointEditingDisabled={!canEditDeformer()}
            pointIndex={selection.pointIndex}
            onCurveToggle={handleCurveToggle}
            onPointChange={handleGridPointChange}
          />
        )}
      </For>
      <Show when={props.notice}>{(message) => <p class="notice">{message()}</p>}</Show>
    </aside>
  )
}
