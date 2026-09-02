import {createUniqueId, For, Show} from 'solid-js'

import type {PuppetParameterValues} from '../../deformation'
import type {PuppetDocument, PuppetSceneDeformerNode} from '../../player'
import {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerPoint,
} from './parameter-keyforms'
import {MAXIMUM_GRID_DIVISIONS, MINIMUM_GRID_DIVISIONS} from './grid-control-points'
import {
  getDeformerAngle,
  getDeformerCenter,
  rotateDeformerControlPoints,
  rotateDeformerCurveHandles,
  translateDeformerControlPoints,
  translateDeformerCurveHandles,
} from './deformer-transform'
import {getSceneNode, isSceneNodeLocked, resizeDeformer} from './scene-graph'
import type {SceneContainerConversionTarget} from './container-conversion'
import {addDeformerCurveHandle, removeDeformerCurveHandle} from './deformer-curve-handles'
import {setDeformerControlPoint, setDeformerControlPoints} from './deformer-control-points'

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

type TransformProperty = 'angle' | 'centerX' | 'centerY'

const getTransformedGeometry = (
  node: PuppetSceneDeformerNode,
  property: TransformProperty,
  value: number,
) => {
  const center = getDeformerCenter(node)

  switch (property) {
    case 'angle': {
      const degrees = value - getDeformerAngle(node)
      return {
        controlPoints: rotateDeformerControlPoints({
          controlPoints: node.controlPoints,
          degrees,
          origin: center,
        }),
        curveHandles: rotateDeformerCurveHandles({
          curveHandles: node.curveHandles,
          degrees,
          origin: center,
        }),
      }
    }
    case 'centerX': {
      const offset = {x: value - center.x, y: 0}
      return {
        controlPoints: translateDeformerControlPoints({controlPoints: node.controlPoints, offset}),
        curveHandles: translateDeformerCurveHandles({curveHandles: node.curveHandles, offset}),
      }
    }
    case 'centerY': {
      const offset = {x: 0, y: value - center.y}
      return {
        controlPoints: translateDeformerControlPoints({controlPoints: node.controlPoints, offset}),
        curveHandles: translateDeformerCurveHandles({curveHandles: node.curveHandles, offset}),
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

  if (props.editMode !== 'parameter') {
    return setDeformerControlPoints({...geometry, document: props.document, nodeId: node.id})
  }

  if (
    props.activeBindingId === undefined ||
    props.activeKeyformValues === undefined ||
    props.activeKeyformValues === null ||
    props.targetNodeIds?.includes(node.id) !== true
  ) {
    return undefined
  }

  return setParameterKeyformDeformerControlPoints({
    bindingId: props.activeBindingId,
    ...geometry,
    document: props.document,
    nodeId: node.id,
    values: props.activeKeyformValues,
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

  if (options.props.editMode !== 'parameter') {
    return setDeformerControlPoint({
      document: options.props.document,
      nodeId: options.node.id,
      pointIndex: options.pointIndex,
      x,
      y,
    })
  }

  if (
    options.props.activeBindingId === undefined ||
    options.props.activeKeyformValues === undefined ||
    options.props.activeKeyformValues === null ||
    options.props.targetNodeIds?.includes(options.node.id) !== true
  ) {
    return undefined
  }

  return setParameterKeyformDeformerPoint({
    bindingId: options.props.activeBindingId,
    document: options.props.document,
    nodeId: options.node.id,
    pointIndex: options.pointIndex,
    values: options.props.activeKeyformValues,
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
    <legend>자유 변형 디포머</legend>
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
      중심 X
      <DeformerNumberInput
        disabled={props.disabled}
        label="자유 변형 중심 X"
        name="deformer-center-x"
        value={getDeformerCenter(props.node).x}
        onChange={(value) => props.onChange('centerX', value)}
      />
    </label>
    <label>
      중심 Y
      <DeformerNumberInput
        disabled={props.disabled}
        label="자유 변형 중심 Y"
        name="deformer-center-y"
        value={getDeformerCenter(props.node).y}
        onChange={(value) => props.onChange('centerY', value)}
      />
    </label>
  </fieldset>
)

interface GridPropertiesProps {
  readonly node: PuppetSceneDeformerNode
  readonly pointEditingDisabled: boolean
  readonly resolutionEditingDisabled: boolean
  readonly onDivisionChange: (axis: 'columns' | 'rows', value: string) => void
  readonly onCurveToggle: (pointIndex: number, hasHandle: boolean) => void
  readonly onPointChange: (pointIndex: number, axis: 'x' | 'y', value: string) => void
}

const GridProperties = (props: GridPropertiesProps) => (
  <fieldset class="deformer-properties grid-points">
    <legend>격자 제어점</legend>
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
    <For each={Array.from({length: props.node.controlPoints.length / 2}, (_, index) => index)}>
      {(pointIndex) => {
        const hasHandle = () =>
          props.node.curveHandles?.some((handle) => handle.pointIndex === pointIndex) === true

        return (
          <div class="grid-point-row">
            <span>{pointIndex + 1}</span>
            <DeformerNumberInput
              disabled={props.pointEditingDisabled}
              label={`격자 제어점 ${pointIndex + 1} X`}
              name={`deformer-point-${pointIndex + 1}-x`}
              value={props.node.controlPoints[pointIndex * 2]}
              onChange={(value) => props.onPointChange(pointIndex, 'x', value)}
            />
            <DeformerNumberInput
              disabled={props.pointEditingDisabled}
              label={`격자 제어점 ${pointIndex + 1} Y`}
              name={`deformer-point-${pointIndex + 1}-y`}
              value={props.node.controlPoints[pointIndex * 2 + 1]}
              onChange={(value) => props.onPointChange(pointIndex, 'y', value)}
            />
            <button
              aria-label={`격자 제어점 ${pointIndex + 1} 곡률 핸들 ${hasHandle() ? '삭제' : '추가'}`}
              class="grid-curve-button"
              disabled={props.resolutionEditingDisabled}
              type="button"
              onClick={() => props.onCurveToggle(pointIndex, hasHandle())}
            >
              곡률 {hasHandle() ? '−' : '+'}
            </button>
          </div>
        )
      }}
    </For>
  </fieldset>
)

export const EditorInspector = (props: EditorInspectorProps) => {
  const titleId = createUniqueId()
  const activeNode = () =>
    props.activeNodeId === undefined
      ? undefined
      : getSceneNode(props.previewDocument ?? props.document, props.activeNodeId)
  const deformerNode = () => {
    const node = activeNode()
    return node?.kind === 'deformer' ? node : undefined
  }
  const canEditRestDeformer = () =>
    props.activeNodeId !== undefined && !isSceneNodeLocked(props.document, props.activeNodeId)
  const canEditDeformer = () =>
    canEditRestDeformer() &&
    (props.editMode !== 'parameter' ||
      (props.activeNodeId !== undefined &&
        props.targetNodeIds?.includes(props.activeNodeId) === true &&
        props.activeBindingId !== undefined &&
        props.activeKeyformValues !== undefined &&
        props.activeKeyformValues !== null))
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
            pointEditingDisabled={!canEditDeformer()}
            resolutionEditingDisabled={!canEditRestDeformer()}
            onCurveToggle={handleCurveToggle}
            onDivisionChange={handleGridDivisionChange}
            onPointChange={handleGridPointChange}
          />
        )}
      </Show>
      <Show when={props.notice}>{(message) => <p class="notice">{message()}</p>}</Show>
    </aside>
  )
}
