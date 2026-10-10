import {useSpatialMeshImport} from './use-spatial-mesh-import'
import {KeyedFor} from './KeyedFor'
import {Dialog} from '@kobalte/core/dialog'
import {createEffect, createMemo, createSignal, For, Show} from 'solid-js'
import {EditorButton, EditorNumberField, useEditorPortalMount} from '../../design-system'
import {createSpatialMeshObject} from '../../deformation/create-spatial-mesh-object'
import {
  PUPPET_SPATIAL_OBJECT_MAX_DEPTH,
  type PuppetPart,
  type PuppetSpatialMesh,
  type PuppetSpatialMeshObject,
  type PuppetSpatialObject,
  type PuppetSpatialPrimitive,
} from '../../player'
import {SpatialMeshPreview, type SpatialPreviewTool} from './SpatialMeshPreview'
import {SpatialMeshToolbar} from './SpatialMeshToolbar'
import {
  SPATIAL_OPERATIONS,
  SPATIAL_SHAPES,
  SPATIAL_TOOL_ICONS,
  SPATIAL_TOOLS,
} from './spatial-mesh-options'
import {
  canCombineSpatialEditorObjects,
  combineSpatialEditorObjects,
  createSpatialEditorObject,
  duplicateSpatialEditorObject,
  findSpatialEditorObject,
  legacySpatialObjects,
  listSpatialEditorRows,
  removeSpatialEditorObject,
  splitSpatialEditorObject,
  updateSpatialEditorObject,
} from './spatial-editor-objects'
import {
  fitSpatialPrimitiveToTarget,
  getSpatialTargetBounds,
  getTargetAlignedCenter,
  getTargetRelativeCenter,
} from './spatial-target-bounds'

interface SpatialMeshDialogProps {
  readonly bounds: {x: number; y: number; width: number; height: number}
  readonly errorMessage?: string | null
  readonly initialObjects?: ReadonlyArray<PuppetSpatialObject>
  readonly initialMesh?: PuppetSpatialMesh
  readonly initialOperations?: ReadonlyArray<PuppetSpatialPrimitive>
  readonly isOpen: boolean
  readonly meshPosition?: readonly [number, number, number]
  readonly referenceParts?: ReadonlyArray<PuppetPart>
  readonly targetParts?: ReadonlyArray<PuppetPart>
  readonly onApply: (objects: ReadonlyArray<PuppetSpatialObject>) => boolean
  readonly onOpenChange: (open: boolean) => void
}

const AXES = ['X', 'Y', 'Z'] as const
const MIN_SHAPE_SIZE = 0.01
const SHAPE_SPACING_RATIO = 0.35

// eslint-disable-next-line max-lines-per-function -- The editor coordinates selection, history, and the modal controls.
export const SpatialMeshDialog = (props: SpatialMeshDialogProps) => {
  const portalMount = useEditorPortalMount()
  const [objects, setObjects] = createSignal<ReadonlyArray<PuppetSpatialObject>>([])
  const [selection, setSelection] = createSignal<ReadonlyArray<string>>([])
  const [mode, setMode] = createSignal<PuppetSpatialPrimitive['mode']>('add')
  const [tool, setTool] = createSignal<SpatialPreviewTool>('orbit')
  const [history, setHistory] = createSignal<ReadonlyArray<ReadonlyArray<PuppetSpatialObject>>>([])
  const [future, setFuture] = createSignal<ReadonlyArray<ReadonlyArray<PuppetSpatialObject>>>([])
  const [importError, setImportError] = createSignal<string>()
  const targetBounds = createMemo(() =>
    getSpatialTargetBounds(props.targetParts ?? props.referenceParts ?? [], props.bounds),
  )
  const {importFile, resetImport} = useSpatialMeshImport({
    bounds: () => props.bounds,
    onError: setImportError,
    onImport: (object) => {
      commit([...objects(), object])
      setSelection([object.id])
    },
  })
  createEffect(() => {
    resetImport()
    if (!props.isOpen) {
      return
    }
    setObjects(
      props.initialObjects ??
        (props.initialMesh === undefined
          ? legacySpatialObjects(props.initialOperations ?? [])
          : [createSpatialMeshObject(props.initialMesh)]),
    )
    setSelection([])
    setHistory([])
    setFuture([])
    setTool('orbit')
    setImportError(undefined)
  })
  const commit = (next: ReadonlyArray<PuppetSpatialObject>) => {
    setHistory((items) => [...items, objects()])
    setFuture([])
    setObjects(next)
  }
  const rows = createMemo(() => listSpatialEditorRows(objects()))
  const selectedRoots = createMemo(() =>
    objects().filter((object) => selection().includes(object.id)),
  )
  const selectedOperation = createMemo(
    () => SPATIAL_OPERATIONS.find((operation) => operation.value === mode())!,
  )
  const selected = createMemo(() => {
    const id = selection().at(-1)
    return id === undefined ? undefined : findSpatialEditorObject(objects(), id)
  })
  const rootIds = createMemo(() => selectedRoots().map((object) => object.id))
  const canApply = () => objects().length === 1 && objects()[0]?.visible === true
  const toggleAll = () =>
    setSelection(
      selectedRoots().length === objects().length ? [] : objects().map((object) => object.id),
    )
  const add = (shape: PuppetSpatialPrimitive['shape']) => {
    const initial = createSpatialEditorObject(targetBounds(), shape)
    const aligned = {
      ...initial,
      center: getTargetAlignedCenter(targetBounds(), props.meshPosition),
    }
    const count = objects().length
    const offset =
      Math.ceil(count / 2) * (count % 2 === 0 ? 1 : -1) * targetBounds().width * SHAPE_SPACING_RATIO
    const object =
      count === 0
        ? aligned
        : {
            ...aligned,
            center: [aligned.center[0] + offset, aligned.center[1], aligned.center[2]] as const,
          }
    commit([...objects(), object])
    setSelection([object.id])
  }
  const fitPrimitive = () => {
    const current = selected()
    if (current?.kind !== 'primitive') {
      return
    }
    const fitted = fitSpatialPrimitiveToTarget(current, targetBounds(), props.meshPosition)
    change(current.id, () => fitted)
  }
  const change = (id: string, update: (object: PuppetSpatialObject) => PuppetSpatialObject) =>
    commit(updateSpatialEditorObject(objects(), id, update))
  const startTransform = () => {
    setHistory((items) => [...items, objects()])
    setFuture([])
  }
  const transform = (
    id: string,
    patch: Partial<Pick<PuppetSpatialMeshObject, 'center' | 'rotation' | 'size'>>,
  ) =>
    setObjects((items) =>
      updateSpatialEditorObject(items, id, (object) =>
        object.kind === 'group' ? object : {...object, ...patch},
      ),
    )
  const changeTriple = (
    object: PuppetSpatialObject,
    key: 'center' | 'size' | 'rotation',
    axis: number,
    value: number,
  ) => {
    if (object.kind === 'group' || !Number.isFinite(value) || (key === 'size' && value <= 0)) {
      return
    }
    const triple: [number, number, number] = [...object[key]]
    const relative = getTargetRelativeCenter(object.center, targetBounds(), props.meshPosition)
    triple[axis] = key === 'center' ? value + object.center[axis] - relative[axis]! : value
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
            <Dialog.Title class="spatial-mesh-accessible-label">메시 편집</Dialog.Title>
            <Dialog.Description class="spatial-mesh-accessible-label">
              도형이나 GLB 메시를 추가하고 배치한 뒤 선택한 객체를 합성합니다.
            </Dialog.Description>
            <SpatialMeshToolbar
              canRedo={future().length > 0}
              canUndo={history().length > 0}
              onAdd={add}
              onImport={importFile}
              onRedo={redo}
              onUndo={undo}
            />
            <div class="spatial-mesh-dialog-layout">
              <div class="spatial-mesh-tool-rail" role="group" aria-label="편집 도구">
                <For each={SPATIAL_TOOLS}>
                  {(item) => (
                    <EditorButton
                      type="button"
                      aria-pressed={tool() === item.value}
                      onClick={() => setTool(item.value)}
                    >
                      <span
                        aria-hidden="true"
                        class={`puppet-icon ${SPATIAL_TOOL_ICONS[item.value]}`}
                      />
                      <span>{item.label}</span>
                    </EditorButton>
                  )}
                </For>
              </div>
              <SpatialMeshPreview
                bounds={targetBounds()}
                isOpen={props.isOpen}
                meshPosition={props.meshPosition}
                objects={objects()}
                referenceParts={props.referenceParts}
                targetBounds={targetBounds()}
                selectedIds={selection()}
                tool={tool()}
                onSelect={(id) => setSelection([id])}
                onTransformStart={startTransform}
                onTransform={transform}
              />
              <aside aria-label="메시 편집 패널" class="spatial-mesh-operations">
                <section aria-label="객체 목록" class="spatial-mesh-object-panel">
                  <div class="spatial-mesh-panel-heading">
                    <h3>
                      객체 목록 <span>{objects().length}</span>
                    </h3>
                    <Show when={objects().length >= 2}>
                      <button type="button" class="spatial-mesh-select-all" onClick={toggleAll}>
                        {selectedRoots().length === objects().length ? '선택 해제' : '전체 선택'}
                      </button>
                    </Show>
                  </div>
                  <Show
                    when={rows().length > 0}
                    fallback={<p>위 도구 막대에서 도형이나 메시를 추가하세요.</p>}
                  >
                    <ul class="spatial-mesh-object-list">
                      <KeyedFor each={rows()} key={(row) => row.object.id}>
                        {(row) => (
                          <li
                            data-depth={row().depth}
                            data-selected={selection().includes(row().object.id)}
                          >
                            <input
                              type="checkbox"
                              aria-label={`${row().object.name} 합성 선택`}
                              checked={selection().includes(row().object.id)}
                              disabled={row().depth > 0}
                              onChange={(event) =>
                                toggleSelection(row().object.id, event.currentTarget.checked)
                              }
                            />
                            <button
                              type="button"
                              aria-label={`${row().object.name} 편집`}
                              onClick={() => setSelection([row().object.id])}
                            >
                              <span
                                aria-hidden="true"
                                class={`puppet-icon ${
                                  row().object.kind === 'group'
                                    ? 'puppet-icon-squares'
                                    : row().object.kind === 'mesh'
                                      ? 'puppet-icon-file-import'
                                      : 'puppet-icon-cube'
                                }`}
                              />{' '}
                              {row().object.name}
                            </button>
                            <button
                              type="button"
                              aria-label={[
                                row().object.name,
                                row().object.visible ? '숨기기' : '보이기',
                              ].join(' ')}
                              onClick={() =>
                                change(row().object.id, (object) => ({
                                  ...object,
                                  visible: !object.visible,
                                }))
                              }
                            >
                              <span
                                aria-hidden="true"
                                class="puppet-icon"
                                classList={{
                                  'puppet-icon-eye': row().object.visible,
                                  'puppet-icon-eye-off': !row().object.visible,
                                }}
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`${row().object.name} 삭제`}
                              onClick={() => remove(row().object.id)}
                            >
                              <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
                            </button>
                          </li>
                        )}
                      </KeyedFor>
                    </ul>
                  </Show>
                  <div class="spatial-mesh-combine-controls">
                    <fieldset class="spatial-mesh-operation-picker">
                      <legend>선택한 객체 연산</legend>
                      <div>
                        <For each={SPATIAL_OPERATIONS}>
                          {(operation) => (
                            <label title={operation.description}>
                              <input
                                type="radio"
                                name="spatial-operation"
                                value={operation.value}
                                aria-label={operation.label}
                                checked={mode() === operation.value}
                                onChange={() => setMode(operation.value)}
                              />
                              <span>
                                <span aria-hidden="true" class={`puppet-icon ${operation.icon}`} />
                                <strong>{operation.shortLabel}</strong>
                              </span>
                            </label>
                          )}
                        </For>
                      </div>
                    </fieldset>
                    <p class="spatial-mesh-operation-context" role="status">
                      {selectedRoots().length < 2
                        ? `${selectedOperation().description} · 객체 2개 이상 선택`
                        : mode() === 'subtract'
                          ? `기준: ${selectedRoots()[0]!.name} · 뺄 객체 ${selectedRoots().length - 1}개`
                          : `목록 순서대로 ${selectedRoots().length}개 객체를 합성합니다.`}
                    </p>
                    <EditorButton
                      type="button"
                      disabled={!canCombineSpatialEditorObjects(objects(), rootIds())}
                      onClick={combine}
                    >
                      <span aria-hidden="true" class="puppet-icon puppet-icon-layers-intersect" />
                      {selectedOperation().label}로 합성
                    </EditorButton>
                    <Show
                      when={
                        rootIds().length >= 2 &&
                        !canCombineSpatialEditorObjects(objects(), rootIds())
                      }
                    >
                      <p role="status">
                        메시 그룹은 최대 {PUPPET_SPATIAL_OBJECT_MAX_DEPTH}단계까지 만들 수 있습니다.
                      </p>
                    </Show>
                  </div>
                </section>
                <section aria-label="선택 속성" class="spatial-mesh-property-panel">
                  <div class="spatial-mesh-panel-heading">
                    <h3>속성</h3>
                  </div>
                  <Show when={selected()} fallback={<p>객체를 선택하면 속성이 표시됩니다.</p>}>
                    {(object) => (
                      <fieldset class="spatial-mesh-operation">
                        <legend>
                          {object().kind === 'group'
                            ? '합친 메시'
                            : object().kind === 'mesh'
                              ? '가져온 메시'
                              : '도형'}{' '}
                          편집
                        </legend>
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
                        <Show when={object().kind !== 'group'}>
                          <>
                            <Show when={object().kind === 'primitive'}>
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
                                  <For each={SPATIAL_SHAPES}>
                                    {(shape) => <option value={shape.value}>{shape.label}</option>}
                                  </For>
                                </select>
                              </label>
                            </Show>
                            <For each={['center', 'rotation', 'size'] as const}>
                              {(key) => (
                                <div class="grid grid-cols-3 gap-editor-field">
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
                                              key === 'center'
                                                ? getTargetRelativeCenter(
                                                    (
                                                      object() as Extract<
                                                        PuppetSpatialObject,
                                                        {kind: 'primitive' | 'mesh'}
                                                      >
                                                    ).center,
                                                    targetBounds(),
                                                    props.meshPosition,
                                                  )[index()]
                                                : (
                                                    object() as Extract<
                                                      PuppetSpatialObject,
                                                      {kind: 'primitive' | 'mesh'}
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
                            <p class="spatial-mesh-coordinate-help">
                              위치 0, 0, 0 = 대상 파츠 중심
                            </p>
                            <Show when={object().kind === 'primitive'}>
                              <EditorButton type="button" onClick={fitPrimitive}>
                                <span aria-hidden="true" class="puppet-icon puppet-icon-focus-2" />
                                대상 크기에 맞추기
                              </EditorButton>
                            </Show>
                            <Show when={object().kind === 'mesh'}>
                              <p class="spatial-mesh-coordinate-help">
                                삼각형은 그대로 유지됩니다. 합성에는 닫힌 3D 메시가 필요합니다.
                              </p>
                            </Show>
                          </>
                        </Show>
                        <div class="flex flex-wrap gap-editor-field">
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
              </aside>
            </div>
            <Show when={importError() ?? props.errorMessage}>
              {(message) => (
                <p role="alert" class="auto-mesh-error spatial-mesh-status">
                  {message()}
                </p>
              )}
            </Show>
            <footer>
              <Show when={objects().length > 1}>
                <p role="status" class="spatial-mesh-apply-hint">
                  객체 {objects().length}개를 하나로 합성하면 적용할 수 있습니다.
                </p>
              </Show>
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
