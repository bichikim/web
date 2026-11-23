import {batch, createMemo, createSignal, For, type JSX, untrack} from 'solid-js'
import {createStore} from 'solid-js/store'
import {COMPOSITION_BUTTON_CLASSES} from './button-classes'
import {COMPOSITION_FIELDS, createComposition} from './presets'
import {PConfigurationExport} from './PConfigurationExport'
import {PCompositionStage} from './PCompositionStage'
import {PPartList} from './PPartList'
import {PPreviewControls} from './PPreviewControls'
import {PTransformField} from './PTransformField'
import type {CompositionPart, CompositionPartControl} from './types'

const PERCENT = 100
const PRECISION = 10
const KEYBOARD_STEP = 0.1
const KEYBOARD_DIRECTIONS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
}
const RAW_COORDINATES = {rotation: 0, scaleX: 100, scaleY: 100, x: 0, y: 0}

interface DragState {
  id: string
  pointer: number
  startX: number
  startY: number
  x: number
  y: number
}

interface PartControlInput {
  baseline: ReadonlyMap<string, CompositionPart>
  part: CompositionPart
  parts: readonly CompositionPart[]
  raw: boolean
  soloId: string | null
}

export interface PCompositionProps {
  assetPath?: string
  initialParts?: readonly CompositionPart[]
}

function controllerTransform(controller: CompositionPart, baseline: typeof RAW_COORDINATES) {
  if (
    controller.x === baseline.x &&
    controller.y === baseline.y &&
    controller.rotation === baseline.rotation &&
    controller.scaleX === baseline.scaleX &&
    controller.scaleY === baseline.scaleY
  ) {
    return 'none'
  }
  return [
    `translate(${controller.x}%, ${controller.y}%)`,
    `rotate(${controller.rotation}deg)`,
    `scale(${controller.scaleX / baseline.scaleX}, ${controller.scaleY / baseline.scaleY})`,
    `rotate(${-baseline.rotation}deg)`,
    `translate(${-baseline.x}%, ${-baseline.y}%)`,
  ].join(' ')
}

function controllerFor(part: CompositionPart, parts: readonly CompositionPart[]) {
  const id = part.controlledBy ?? part.follows
  return id === undefined ? undefined : parts.find((item) => item.id === id)
}

function receiverIsVisible(part: CompositionPart, parts: readonly CompositionPart[]) {
  if (part.clipTo === undefined) {
    return true
  }
  const receiver = parts.find((item) => item.id === part.clipTo)
  return (
    receiver !== undefined && receiver.visible && (controllerFor(receiver, parts)?.visible ?? true)
  )
}

function resolvePartControl(input: PartControlInput): CompositionPartControl {
  const {part, parts, soloId} = input
  const controller = controllerFor(part, parts)
  const baseline = controller === undefined ? undefined : input.baseline.get(controller.id)
  const inSolo = part.id === soloId || part.controlledBy === soloId
  const opacity = part.id === soloId ? PERCENT : (controller?.opacity ?? PERCENT)
  return {
    opacity: (part.opacity * opacity) / PERCENT,
    transform:
      controller === undefined || baseline === undefined
        ? 'none'
        : controllerTransform(controller, input.raw ? RAW_COORDINATES : baseline),
    visible:
      part.visible && (inSolo || ((controller?.visible ?? true) && receiverIsVisible(part, parts))),
  }
}

function adjacentPaintBlock(parts: readonly CompositionPart[], owner: CompositionPart) {
  const index = parts.indexOf(owner)
  let start = index
  let end = index + 1
  while (parts[start - 1]?.controlledBy === owner.id) {
    start -= 1
  }
  while (parts[end]?.controlledBy === owner.id) {
    end += 1
  }
  return {end, start}
}

function reorderParts(parts: readonly CompositionPart[], selectedId: string, direction: number) {
  const controls = parts.filter((part) => part.controlledBy === undefined)
  const position = controls.findIndex((part) => part.id === selectedId)
  const selected = controls[position]
  const neighbor = controls[position + direction]
  if (selected === undefined || neighbor === undefined) {
    return [...parts]
  }
  const [back, front] = direction > 0 ? [selected, neighbor] : [neighbor, selected]
  const backBlock = adjacentPaintBlock(parts, back)
  const frontBlock = adjacentPaintBlock(parts, front)
  const between = parts.slice(backBlock.end, frontBlock.start)
  const beforeFront = between.filter((part) => part.controlledBy === front.id)
  const afterBack = between.filter((part) => part.controlledBy === back.id)
  const stationary = between.filter(
    (part) => part.controlledBy !== front.id && part.controlledBy !== back.id,
  )
  return [
    ...parts.slice(0, backBlock.start),
    ...beforeFront,
    ...parts.slice(frontBlock.start, frontBlock.end),
    ...stationary,
    ...parts.slice(backBlock.start, backBlock.end),
    ...afterBack,
    ...parts.slice(frontBlock.end),
  ]
}

function useComposition(props: PCompositionProps) {
  const initial = untrack(
    () => props.initialParts?.map((part) => ({...part})) ?? createComposition(),
  )
  const baseline = new Map(initial.map((part) => [part.id, part]))
  const restore = () => initial.map((part) => ({...part}))
  const [parts, setParts] = createStore(restore())
  const [selectedId, setSelectedId] = createSignal(
    (initial.find((part) => part.visible && part.controlledBy === undefined) ?? initial[0]).id,
  )
  const [raw, setRaw] = createSignal(false)
  const [soloId, setSoloId] = createSignal<string | null>(null)
  const [pose, setPose] = createSignal(0)
  const [background, setBackground] = createSignal('#d6d0c7')
  const [drag, setDrag] = createSignal<DragState | null>(null)
  const selectableParts = createMemo(() => parts.filter((part) => part.controlledBy === undefined))
  const selected = createMemo(() => parts.find((part) => part.id === selectedId()) ?? parts[0])
  const position = createMemo(() => selectableParts().findIndex((part) => part.id === selectedId()))
  const getControl = (part: CompositionPart) =>
    resolvePartControl({baseline, part, parts, raw: raw(), soloId: soloId()})
  const configuration = createMemo(() =>
    JSON.stringify(
      {
        parts: [...parts],
        preview: {
          background: background(),
          coordinateMode: raw() ? 'generated' : 'fitted',
          pose: pose(),
          soloPartId: soloId(),
        },
        version: 1,
      },
      null,
      2,
    ),
  )
  const patchSelected = (patch: Partial<CompositionPart>) =>
    setParts((part) => part.id === selectedId(), patch)
  const handleVisibility = (ids: string | readonly string[], visible: boolean) =>
    batch(() => {
      setSoloId(null)
      setParts(
        (part) => (typeof ids === 'string' ? part.id === ids : ids.includes(part.id)),
        'visible',
        visible,
      )
    })
  const handleRestore = () => {
    setDrag(null)
    setParts(restore())
    setPose(0)
    setRaw(false)
    setSoloId(null)
  }
  const handleRaw = () => {
    setDrag(null)
    setRaw(true)
    setPose(0)
    setParts(() => true, RAW_COORDINATES)
  }
  const handleSolo = () => {
    const id = selectedId()
    batch(() => {
      setParts(
        (part) => part.controlledBy === undefined,
        (part) => ({visible: part.id === id}),
      )
      setSoloId(id)
    })
  }
  const handleShow = () => {
    setSoloId(null)
    setParts(() => true, 'visible', true)
  }
  const movePart = (direction: number) => setParts(reorderParts(parts, selectedId(), direction))
  const handleDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.button !== 0 || drag() !== null) {
      return
    }
    const part = selected()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: part.id,
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: part.x,
      y: part.y,
    })
  }
  const handleMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const current = drag()
    if (current === null || current.pointer !== event.pointerId) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    setParts((part) => part.id === current.id, {
      x:
        Math.round(
          (current.x + ((event.clientX - current.startX) / bounds.width) * PERCENT) * PRECISION,
        ) / PRECISION,
      y:
        Math.round(
          (current.y + ((event.clientY - current.startY) / bounds.height) * PERCENT) * PRECISION,
        ) / PRECISION,
    })
  }
  const handleEnd: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (drag()?.pointer === event.pointerId) {
      setDrag(null)
    }
  }
  const handleKey: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    const step = KEYBOARD_DIRECTIONS[event.key]
    if (step === undefined) {
      return
    }
    event.preventDefault()
    const part = selected()
    const distance = event.shiftKey ? 1 : KEYBOARD_STEP
    patchSelected({x: part.x + step[0] * distance, y: part.y + step[1] * distance})
  }

  return {
    background,
    configuration,
    getControl,
    handleBackward: () => movePart(-1),
    handleDown,
    handleEnd,
    handleForward: () => movePart(1),
    handleKey,
    handleMove,
    handleRaw,
    handleRestore,
    handleShow,
    handleSolo,
    handleVisibility,
    parts,
    patchSelected,
    pose,
    position,
    selectableParts,
    selected,
    selectedId,
    setBackground,
    setPose,
    setSelectedId,
  }
}

export function PComposition(props: PCompositionProps = {}) {
  const composition = useComposition(props)
  const isPartVisible = (part: CompositionPart) => composition.getControl(part).visible
  return (
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="min-w-0">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <button
            class={COMPOSITION_BUTTON_CLASSES}
            onClick={composition.handleRestore}
            type="button"
          >
            기본 조합 복원
          </button>
          <button class={COMPOSITION_BUTTON_CLASSES} onClick={composition.handleRaw} type="button">
            생성 좌표 그대로
          </button>
          <button class={COMPOSITION_BUTTON_CLASSES} onClick={composition.handleShow} type="button">
            모두 표시
          </button>
          <button class={COMPOSITION_BUTTON_CLASSES} onClick={composition.handleSolo} type="button">
            선택만 표시
          </button>
        </div>
        <PCompositionStage
          assetPath={props.assetPath}
          background={composition.background()}
          getControl={composition.getControl}
          onKeyDown={composition.handleKey}
          onPointerDown={composition.handleDown}
          onPointerEnd={composition.handleEnd}
          onPointerMove={composition.handleMove}
          parts={composition.parts}
          pose={composition.pose()}
        />
        <p class="mt-3 text-sm leading-6 text-#bdb2c4">
          선택한 파트: <strong class="text-#f4d7b5">{composition.selected().label}</strong> · 화면을
          드래그하거나 방향키로 이동하세요. Shift + 방향키는 크게 이동합니다.
        </p>
        <PPreviewControls
          background={composition.background()}
          onBackgroundChange={composition.setBackground}
          onPoseChange={composition.setPose}
          pose={composition.pose()}
        />
        <PConfigurationExport configuration={composition.configuration()} />
      </section>
      <aside class="grid content-start gap-5 rounded-xl border border-#ffffff/12 bg-#211a29 p-4">
        <section>
          <h2 class="mb-2 mt-0 text-base font-750">파트 그룹</h2>
          <p class="mb-3 mt-0 text-xs leading-5 text-#bdb2c4">
            체크로 그룹 표시 · 제목으로 펼치기 · 그룹 안은 뒤에서 앞으로
          </p>
          <PPartList
            isPartVisible={isPartVisible}
            onSelect={composition.setSelectedId}
            onVisibility={composition.handleVisibility}
            parts={composition.selectableParts()}
            selectedId={composition.selectedId()}
          />
        </section>
        <section class="border-t border-#ffffff/12 pt-4">
          <h2 class="mb-4 mt-0 text-base font-750">{composition.selected().label} 조정</h2>
          <div class="mb-4 flex gap-2">
            <button
              class={COMPOSITION_BUTTON_CLASSES}
              disabled={composition.position() === 0}
              onClick={composition.handleBackward}
              type="button"
            >
              뒤로
            </button>
            <button
              class={COMPOSITION_BUTTON_CLASSES}
              disabled={composition.position() === composition.selectableParts().length - 1}
              onClick={composition.handleForward}
              type="button"
            >
              앞으로
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <For each={COMPOSITION_FIELDS}>
              {(field) => (
                <PTransformField
                  field={field}
                  onChange={composition.patchSelected}
                  part={composition.selected()}
                />
              )}
            </For>
          </div>
        </section>
      </aside>
    </div>
  )
}
