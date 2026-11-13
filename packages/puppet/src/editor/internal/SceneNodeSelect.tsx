import {createEffect, createMemo, For, on, Show} from 'solid-js'
import {TextField} from '@kobalte/core/text-field'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {EditorTextInput} from '../../design-system'
import {isSceneContainerNode, type PuppetDocument, type PuppetSceneNode} from '../../player'
import {useSceneNodeName} from './use-scene-node-name'
import {LayerName} from './LayerName'
import {LayerContainerIcon} from './LayerContainerIcon'
import {ContainerKindSelect} from './ContainerKindSelect'
import {EditorLayerMaskUsage} from './EditorLayerMaskUsage'
import {getLayerSelectionLabel, LayerNodeSummary} from './LayerNodeSummary'

interface SceneNodeSelectProps {
  readonly onRenamingChange: (renaming: boolean) => void
  readonly renameRequest: number
  readonly document: PuppetDocument
  readonly locked: boolean
  readonly maskPickDisabled: boolean
  readonly maskPicking: boolean
  readonly maskUsageCount: number
  readonly node: PuppetSceneNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
  readonly parameterLinks: ReadonlyArray<string>
  readonly selected: boolean
}

export const SceneNodeSelect = (props: SceneNodeSelectProps) => {
  const nameEditor = useSceneNodeName({
    disabled: () => props.locked || props.maskPicking || props.onDocumentChange === undefined,
    document: () => props.document,
    node: () => props.node,
    onDocumentChange: (document) => props.onDocumentChange?.(document),
  })
  createEffect(() => props.onRenamingChange(nameEditor.isRenaming()))
  const part = createMemo(() => props.document.parts.find((part) => part.id === props.node.id))

  const handleSelect = (event: MouseEvent) => {
    const nameClicked =
      event.target instanceof Element && event.target.closest('.layer-name') !== null
    if (props.selected && nameClicked && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      nameEditor.startRenaming()
      return
    }
    props.onSelect(event, props.node)
  }
  createEffect(
    on(
      () => props.renameRequest,
      () => nameEditor.startRenaming(),
      {defer: true},
    ),
  )

  return (
    <Show
      when={nameEditor.isRenaming()}
      fallback={
        <div class="puppet-layer-choice">
          <Show when={isSceneContainerNode(props.node)}>
            <ContainerKindSelect
              onSelect={(event) => props.onSelect(event, props.node)}
              document={props.document}
              node={props.node}
              disabled={props.locked || props.maskPicking}
              onDocumentChange={props.onDocumentChange}
            />
          </Show>
          <ToggleButton
            aria-label={getLayerSelectionLabel(props.node)}
            class="layer-select"
            classList={{'mask-pick-candidate': props.maskPicking && !props.maskPickDisabled}}
            disabled={props.maskPickDisabled}
            pressed={props.selected}
            title={
              props.maskPickDisabled
                ? '이 레이어에는 현재 파트의 마스크를 적용할 수 없습니다.'
                : '더블클릭하여 이름 수정'
            }
            onClick={handleSelect}
            onDblClick={nameEditor.startRenaming}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'F2') {
                event.preventDefault()
                nameEditor.startRenaming()
              }
            }}
          >
            <Show when={props.node.kind === 'part'}>
              <span class="layer-thumbnail" aria-hidden="true">
                <img alt="" src={part()?.texture.src} />
              </span>
            </Show>
            <span class="layer-label">
              <LayerName name={props.node.name} selected={props.selected} />
              <LayerNodeSummary
                node={props.node}
                vertexCount={(part()?.mesh.vertices.length ?? 0) / 2}
              />
              <Show when={props.parameterLinks.length > 0}>
                <span class="layer-parameter-links puppet-layer-parameter-links">
                  <For each={props.parameterLinks}>{(name) => <span>{name}</span>}</For>
                </span>
              </Show>
            </span>
            <EditorLayerMaskUsage count={props.maskUsageCount} />
          </ToggleButton>
        </div>
      }
    >
      <TextField
        class="puppet-layer-name-editor"
        value={nameEditor.nameDraft()}
        onChange={nameEditor.setNameDraft}
      >
        <Show
          when={props.node.kind !== 'part'}
          fallback={
            <span class="layer-thumbnail" aria-hidden="true">
              <img alt="" src={part()?.texture.src} />
            </span>
          }
        >
          <LayerContainerIcon
            kind={props.node.kind === 'deformer' ? 'deformer' : 'group'}
            pin={props.node.kind === 'deformer' && props.node.pins !== undefined}
            rotation={props.node.kind === 'deformer' && props.node.deformerType === 'rotation'}
            bone={props.node.kind === 'deformer' && props.node.boneRestPoints !== undefined}
            curve={props.node.kind === 'deformer' && props.node.curveAxis !== undefined}
            spatial={props.node.kind === 'deformer' && props.node.deformerType === 'spatial'}
          />
        </Show>
        <EditorTextInput
          ref={nameEditor.setInput}
          aria-label={`${props.node.name} ${props.node.kind === 'part' ? '파츠' : '그룹'} 이름`}
          onBlur={nameEditor.finishRenaming}
          onKeyDown={(event: KeyboardEvent) => {
            if (event.isComposing) {
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              nameEditor.finishRenaming()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              nameEditor.cancelRenaming()
            }
          }}
        />
      </TextField>
    </Show>
  )
}
