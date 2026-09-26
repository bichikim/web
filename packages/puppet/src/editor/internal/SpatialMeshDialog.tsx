import {Dialog} from '@kobalte/core/dialog'
import {createEffect, createMemo, createSignal, For, Show} from 'solid-js'
import {EditorButton, EditorNumberField, useEditorPortalMount} from '../../design-system'
import type {PuppetSpatialObject, PuppetSpatialPrimitive} from '../../player'
import {SpatialMeshPreview, type SpatialPreviewTool} from './SpatialMeshPreview'
import {
  combineSpatialEditorObjects,
  createSpatialEditorObject,
  duplicateSpatialEditorObject,
  findSpatialEditorObject,
  legacySpatialObjects,
  removeSpatialEditorObject,
  splitSpatialEditorObject,
  updateSpatialEditorObject,
} from './spatial-editor-objects'

interface SpatialMeshDialogProps {
  readonly bounds: {x: number; y: number; width: number; height: number}
  readonly errorMessage?: string | null
  readonly initialObjects?: ReadonlyArray<PuppetSpatialObject>
  readonly initialOperations?: ReadonlyArray<PuppetSpatialPrimitive>
  readonly isOpen: boolean
  readonly onApply: (objects: ReadonlyArray<PuppetSpatialObject>) => boolean
  readonly onOpenChange: (open: boolean) => void
}

interface ObjectRow {
  readonly object: PuppetSpatialObject
  readonly depth: number
}

const SHAPES = [
  {label: '네모', value: 'box'},
  {label: '세모', value: 'prism'},
  {label: '동그라미', value: 'sphere'},
  {label: '원기둥', value: 'cylinder'},
] as const
const OPERATIONS = [
  {label: '합치기', value: 'add'},
  {label: '깎기', value: 'subtract'},
  {label: '교차', value: 'intersect'},
  {label: '부드럽게 합치기', value: 'smooth-add'},
] as const
const AXES = ['X', 'Y', 'Z'] as const
const MIN_SHAPE_SIZE = 0.01
const SHAPE_SPACING_RATIO = 0.35
const TOOLS: ReadonlyArray<{label: string; value: SpatialPreviewTool}> = [
  {label: '시점', value: 'orbit'},
  {label: '이동', value: 'move'},
  {label: '회전', value: 'rotate'},
  {label: '크기', value: 'scale'},
]

const listRows = (objects: ReadonlyArray<PuppetSpatialObject>, depth = 0): ObjectRow[] =>
  objects.flatMap((object) => [
    {depth, object},
    ...(object.kind === 'group' ? listRows(object.children, depth + 1) : []),
  ])

// eslint-disable-next-line max-lines-per-function -- The editor coordinates selection, history, and the modal controls.
export const SpatialMeshDialog = (props: SpatialMeshDialogProps) => {
  const portalMount = useEditorPortalMount()
  const [objects, setObjects] = createSignal<ReadonlyArray<PuppetSpatialObject>>([])
  const [selection, setSelection] = createSignal<ReadonlyArray<string>>([])
  const [mode, setMode] = createSignal<PuppetSpatialPrimitive['mode']>('add')
  const [tool, setTool] = createSignal<SpatialPreviewTool>('orbit')
  const [history, setHistory] = createSignal<ReadonlyArray<ReadonlyArray<PuppetSpatialObject>>>([])
  const [future, setFuture] = createSignal<ReadonlyArray<ReadonlyArray<PuppetSpatialObject>>>([])
  createEffect(() => {
    if (!props.isOpen) {
      return
    }
    setObjects(props.initialObjects ?? legacySpatialObjects(props.initialOperations ?? []))
    setSelection([])
    setHistory([])
    setFuture([])
    setTool('orbit')
  })
  const commit = (next: ReadonlyArray<PuppetSpatialObject>) => {
    setHistory((items) => [...items, objects()])
    setFuture([])
    setObjects(next)
  }
  const rows = createMemo(() => listRows(objects()))
  const selected = createMemo(() => {
    const id = selection().at(-1)
    return id === undefined ? undefined : findSpatialEditorObject(objects(), id)
  })
  const rootIds = createMemo(() =>
    selection().filter((id) => objects().some((object) => object.id === id)),
  )
  const canApply = () => objects().length === 1 && objects()[0]?.visible === true
  const add = (shape: PuppetSpatialPrimitive['shape']) => {
    const initial = createSpatialEditorObject(props.bounds, shape)
    const count = objects().length
    const offset =
      Math.ceil(count / 2) * (count % 2 === 0 ? 1 : -1) * props.bounds.width * SHAPE_SPACING_RATIO
    const object =
      count === 0
        ? initial
        : {
            ...initial,
            center: [initial.center[0] + offset, initial.center[1], initial.center[2]] as const,
          }
    commit([...objects(), object])
    setSelection([object.id])
  }
  const change = (id: string, update: (object: PuppetSpatialObject) => PuppetSpatialObject) =>
    commit(updateSpatialEditorObject(objects(), id, update))
  const startTransform = () => {
    setHistory((items) => [...items, objects()])
    setFuture([])
  }
  const transform = (
    id: string,
    patch: Partial<Extract<PuppetSpatialObject, {kind: 'primitive'}>>,
  ) =>
    setObjects((items) =>
      updateSpatialEditorObject(items, id, (object) =>
        object.kind === 'primitive' ? {...object, ...patch} : object,
      ),
    )
  const changeTriple = (
    object: PuppetSpatialObject,
    key: 'center' | 'size' | 'rotation',
    axis: number,
    value: number,
  ) => {
    if (object.kind !== 'primitive' || !Number.isFinite(value) || (key === 'size' && value <= 0)) {
      return
    }
    const triple: [number, number, number] = [...object[key]]
    triple[axis] = value
    transform(object.id, {[key]: triple})
  }
  const toggleSelection = (id: string, checked: boolean) =>
    setSelection((ids) =>
      checked ? [...ids.filter((item) => item !== id), id] : ids.filter((item) => item !== id),
    )
  const combine = () => {
    const next = combineSpatialEditorObjects(objects(), rootIds(), mode())
    const group = next.find((object) => !objects().includes(object))
    commit(next)
    setSelection(group === undefined ? [] : [group.id])
  }
  const split = (object: PuppetSpatialObject) => {
    if (object.kind !== 'group') {
      return
    }
    commit(splitSpatialEditorObject(objects(), object.id))
    setSelection(object.children.map((child) => child.id))
  }
  const remove = (id: string) => {
    const next = removeSpatialEditorObject(objects(), id)
    commit(next)
    setSelection((ids) => ids.filter((item) => findSpatialEditorObject(next, item) !== undefined))
  }
  const duplicate = (object: PuppetSpatialObject) => {
    const copy = duplicateSpatialEditorObject(object)
    commit([...objects(), copy])
    setSelection([copy.id])
  }
  const undo = () => {
    const previous = history().at(-1)
    if (previous === undefined) {
      return
    }
    setFuture((items) => [...items, objects()])
    setHistory((items) => items.slice(0, -1))
    setObjects(previous)
    setSelection([])
  }
  const redo = () => {
    const next = future().at(-1)
    if (next === undefined) {
      return
    }
    setHistory((items) => [...items, objects()])
    setFuture((items) => items.slice(0, -1))
    setObjects(next)
    setSelection([])
  }
  const apply = (event: SubmitEvent) => {
    event.preventDefault()
    if (canApply() && props.onApply(objects())) {
      props.onOpenChange(false)
    }
  }
  return (
    <Dialog modal open={props.isOpen} onOpenChange={props.onOpenChange}>
      <Dialog.Portal mount={portalMount}>
        <Dialog.Overlay class="auto-mesh-dialog-overlay" />
        <Dialog.Content class="spatial-mesh-dialog-content">
          <form onSubmit={apply}>
            <header>
              <div>
                <Dialog.Title>3D 변형 메시 만들기</Dialog.Title>
                <Dialog.Description>
                  도형을 따로 배치하고 선택한 도형만 합쳐 이미지 변형용 메시를 만듭니다.
                </Dialog.Description>
              </div>
              <Dialog.CloseButton aria-label="닫기">×</Dialog.CloseButton>
            </header>
            <div class="spatial-mesh-editor-toolbar" aria-label="도형 추가">
              <For each={SHAPES}>
                {(shape) => (
                  <EditorButton type="button" onClick={() => add(shape.value)}>
                    {shape.label} 추가
                  </EditorButton>
                )}
              </For>
              <EditorButton type="button" disabled={history().length === 0} onClick={undo}>
                실행 취소
              </EditorButton>
              <EditorButton type="button" disabled={future().length === 0} onClick={redo}>
                다시 실행
              </EditorButton>
            </div>
            <div class="spatial-mesh-editor-toolbar" role="group" aria-label="3D 도구">
              <For each={TOOLS}>
                {(item) => (
                  <EditorButton
                    type="button"
                    aria-pressed={tool() === item.value}
                    onClick={() => setTool(item.value)}
                  >
                    {item.label}
                  </EditorButton>
                )}
              </For>
            </div>
            <div class="spatial-mesh-dialog-layout">
              <SpatialMeshPreview
                bounds={props.bounds}
                isOpen={props.isOpen}
                objects={objects()}
                selectedIds={selection()}
                tool={tool()}
                onSelect={(id) => setSelection([id])}
                onTransformStart={startTransform}
                onTransform={transform}
              />
              <section aria-label="메시 편집" class="spatial-mesh-operations">
                <h3>메시 목록</h3>
                <Show when={rows().length > 0} fallback={<p>도형을 추가해 시작하세요.</p>}>
                  <ul class="spatial-mesh-object-list">
                    <For each={rows()}>
                      {(row) => (
                        <li
                          data-depth={row.depth}
                          data-selected={selection().includes(row.object.id)}
                        >
                          <input
                            type="checkbox"
                            aria-label={`${row.object.name} 합성 선택`}
                            checked={selection().includes(row.object.id)}
                            disabled={row.depth > 0}
                            onChange={(event) =>
                              toggleSelection(row.object.id, event.currentTarget.checked)
                            }
                          />
                          <button
                            type="button"
                            aria-label={`${row.object.name} 편집`}
                            onClick={() => setSelection([row.object.id])}
                          >
                            {row.object.kind === 'group' ? '◫' : '◇'} {row.object.name}
                          </button>
                          <button
                            type="button"
                            aria-label={`${row.object.name} ${row.object.visible ? '숨기기' : '보이기'}`}
                            onClick={() =>
                              change(row.object.id, (object) => ({
                                ...object,
                                visible: !object.visible,
                              }))
                            }
                          >
                            {row.object.visible ? '◉' : '○'}
                          </button>
                          <button
                            type="button"
                            aria-label={`${row.object.name} 삭제`}
                            onClick={() => remove(row.object.id)}
                          >
                            삭제
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <div class="spatial-mesh-combine-controls">
                  <label>
                    연산
                    <select
                      aria-label="합성 연산"
                      value={mode()}
                      onChange={(event) =>
                        setMode(event.currentTarget.value as PuppetSpatialPrimitive['mode'])
                      }
                    >
                      <For each={OPERATIONS}>
                        {(operation) => <option value={operation.value}>{operation.label}</option>}
                      </For>
                    </select>
                  </label>
                  <EditorButton type="button" disabled={rootIds().length < 2} onClick={combine}>
                    선택한 도형 합치기
                  </EditorButton>
                </div>
                <Show when={selected()}>
                  {(object) => (
                    <fieldset class="spatial-mesh-operation">
                      <legend>{object().kind === 'group' ? '합친 메시' : '도형'} 편집</legend>
                      <label>
                        이름{' '}
                        <input
                          aria-label="메시 이름"
                          value={object().name}
                          onChange={(event) =>
                            change(object().id, (current) => ({
                              ...current,
                              name: event.currentTarget.value,
                            }))
                          }
                        />
                      </label>
                      <Show when={object().kind === 'primitive'}>
                        <>
                          <label>
                            도형{' '}
                            <select
                              aria-label="도형 종류"
                              value={
                                (object() as Extract<PuppetSpatialObject, {kind: 'primitive'}>)
                                  .shape
                              }
                              onChange={(event) =>
                                change(object().id, (current) =>
                                  current.kind === 'primitive'
                                    ? {
                                        ...current,
                                        shape: event.currentTarget
                                          .value as PuppetSpatialPrimitive['shape'],
                                      }
                                    : current,
                                )
                              }
                            >
                              <For each={SHAPES}>
                                {(shape) => <option value={shape.value}>{shape.label}</option>}
                              </For>
                            </select>
                          </label>
                          <For each={['center', 'rotation', 'size'] as const}>
                            {(key) => (
                              <div class="grid grid-cols-3 gap-2">
                                <For each={AXES}>
                                  {(axis, index) => {
                                    let editRecorded = false
                                    const handleValueChange = (value: number) => {
                                      if (!editRecorded) {
                                        startTransform()
                                        editRecorded = true
                                      }
                                      changeTriple(object(), key, index(), value)
                                    }
                                    const handleEditEnd = () => {
                                      editRecorded = false
                                    }
                                    return (
                                      <label>
                                        {key === 'center'
                                          ? '위치'
                                          : key === 'rotation'
                                            ? '회전'
                                            : '크기'}{' '}
                                        {axis}
                                        <EditorNumberField
                                          label={`${key} ${axis}`}
                                          minimum={key === 'size' ? MIN_SHAPE_SIZE : undefined}
                                          step="any"
                                          value={
                                            (
                                              object() as Extract<
                                                PuppetSpatialObject,
                                                {kind: 'primitive'}
                                              >
                                            )[key][index()]
                                          }
                                          onEditEnd={handleEditEnd}
                                          onValueChange={handleValueChange}
                                        />
                                      </label>
                                    )
                                  }}
                                </For>
                              </div>
                            )}
                          </For>
                        </>
                      </Show>
                      <div class="flex flex-wrap gap-2">
                        <Show when={object().kind === 'group'}>
                          <EditorButton type="button" onClick={() => split(object())}>
                            합치기 해제
                          </EditorButton>
                        </Show>
                        <Show when={objects().some((root) => root.id === object().id)}>
                          <EditorButton type="button" onClick={() => duplicate(object())}>
                            복제
                          </EditorButton>
                        </Show>
                      </div>
                    </fieldset>
                  )}
                </Show>
              </section>
            </div>
            <Show when={props.errorMessage}>
              {(message) => (
                <p role="alert" class="auto-mesh-error">
                  {message()}
                </p>
              )}
            </Show>
            <Show when={objects().length > 1}>
              <p role="status">메시를 적용하려면 목록의 도형을 모두 합쳐 하나의 메시로 만드세요.</p>
            </Show>
            <footer>
              <Dialog.CloseButton class="secondary">취소</Dialog.CloseButton>
              <EditorButton type="submit" disabled={!canApply()}>
                메시 적용
              </EditorButton>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
