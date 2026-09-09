import {useSkinSessionControls} from './skin-session'
import {createEffect, createMemo, createSignal, on} from 'solid-js'
import type {JSX} from 'solid-js'
import {useSkinPaintGesture} from './use-skin-paint-gesture'
import {getDocumentScene, type PuppetDocument} from '../../player'
import type {MeshEditorProps} from '../mesh-editor-contract'
import {getDeformerPreviewDocument, getPartPreviewVertices} from './mesh-preview'
import {applySceneDeformers} from './scene-deformation'
import {findNode, findNodeLock} from './scene-tree'
import {setPartSkinning} from './skinning'
import {createSkinStroke, inspectSkinTriangles, replaceSkinWeights} from './skinning-edit'
import type {WeightPaintMode} from './weight-paint'

export interface SkinningToolsProps extends MeshEditorProps {
  readonly sourceDocument: PuppetDocument
  readonly onEditStart?: () => void
  readonly onEditEnd?: () => void
  readonly renderControls?: (controls: JSX.Element) => JSX.Element
}
const INITIAL_RADIUS = 60
const INITIAL_AMOUNT = 30
const PERCENT = 100
export const useSkinningTools = (props: SkinningToolsProps) => {
  const {enabled, setEnabled, target, setTarget} = useSkinSessionControls(
    () => props.activePartId,
    () => binding(),
  )
  const [tool, setTool] = createSignal('select')
  const [radius, setRadius] = createSignal(INITIAL_RADIUS)
  const [amount, setAmount] = createSignal(INITIAL_AMOUNT)
  const [protect, setProtect] = createSignal(false)
  const [selected, setSelected] = createSignal<readonly number[]>([])
  const [value, setValue] = createSignal(PERCENT / 2)
  const part = createMemo(() =>
    props.sourceDocument.parts.find((part) => part.id === props.activePartId),
  )
  const binding = createMemo(() => {
    const node = findNode(getDocumentScene(props.sourceDocument).roots, props.activePartId ?? '')
    return node?.kind === 'part' ? node.skinning : undefined
  })
  const locked = () =>
    props.onDocumentChange === undefined ||
    findNodeLock(getDocumentScene(props.sourceDocument).roots, props.activePartId ?? '')
  const positions = createMemo(() => {
    const vertices = new Map(
      props.document.parts.map((part) => [part.id, [...getPartPreviewVertices(props, part)]]),
    )
    applySceneDeformers({document: getDeformerPreviewDocument(props), verticesByPartId: vertices})
    return vertices.get(props.activePartId ?? '') ?? []
  })
  const triangles = createMemo(() =>
    inspectSkinTriangles(part()?.mesh.vertices ?? [], positions(), part()?.mesh.indices ?? []),
  )
  const update = (next: NonNullable<ReturnType<typeof binding>>) => {
    const currentPart = part()
    if (locked() || currentPart === undefined) {
      return
    }
    props.onDocumentChange?.(setPartSkinning(props.sourceDocument, currentPart.id, next))
  }
  const gesture = useSkinPaintGesture({
    context: () =>
      [
        props.activePartId,
        enabled(),
        tool(),
        target(),
        radius(),
        amount(),
        protect(),
        props.editMode,
        JSON.stringify(props.parameterValueMap),
        props.previewTime,
      ].join(':'),
    document: () => props.sourceDocument,
    create: () => {
      const skin = binding()
      const mesh = part()?.mesh
      const mode = tool()
      if (
        target() < 0 ||
        !enabled() ||
        mode === 'select' ||
        locked() ||
        skin === undefined ||
        mesh === undefined
      ) {
        return undefined
      }
      const stroke = createSkinStroke({
        binding: skin,
        target: target(),
        indices: mesh.indices,
        vertices: positions(),
        radius: radius(),
        mode: mode as WeightPaintMode,
        strength: amount() / PERCENT,
        protect: protect(),
        selected: selected(),
      })
      return (point) => update(stroke.paint(point))
    },
    onEnd: () => props.onEditEnd?.(),
    onStart: () => props.onEditStart?.(),
  })
  createEffect(
    on(
      () => props.activePartId,
      () => {
        gesture.stop()
        setEnabled(false)
        setSelected([])
        setTarget(0)
      },
    ),
  )
  return {
    binding,
    locked,
    enabled,
    part,
    positions,
    setEnabled,
    setTarget,
    triangles,
    radius,
    setTool,
    amount,
    tool,
    protect,
    target,
    selected,
    setAmount,
    setRadius,
    setProtect,
    setSelected,
    setValue,
    value,
    ...gesture,
    apply: () => {
      const skin = binding()
      if (skin === undefined || target() < 0 || locked() || selected().length === 0) {
        return
      }
      props.onEditStart?.()
      update(
        replaceSkinWeights(
          skin,
          target(),
          new Map(selected().map((index) => [index, value() / PERCENT])),
        ),
      )
      props.onEditEnd?.()
    },
    select: (index: number, additive: boolean) => {
      if (tool() !== 'select') {
        return
      }
      setSelected((previous) =>
        additive
          ? previous.includes(index)
            ? previous.filter((vertex) => vertex !== index)
            : [...previous, index]
          : [index],
      )
      setValue((binding()?.influences[target()]?.weights[index] ?? 0) * PERCENT)
    },
  }
}
