import {createMemo, createSignal, For, Show} from 'solid-js'
import {TextField} from '@kobalte/core/text-field'
import {ToggleButton} from '@kobalte/core/toggle-button'
import {EditorTextInput} from '../../design-system'
import {isSceneContainerNode, type PuppetDocument, type PuppetSceneNode} from '../../player'
import {renameSceneNode} from './scene-graph'
import {LayerName} from './LayerName'
import {LayerContainerIcon} from './LayerContainerIcon'
import {ContainerKindSelect} from './ContainerKindSelect'
import {EditorLayerMaskUsage} from './EditorLayerMaskUsage'
import {getLayerSelectionLabel, LayerNodeSummary} from './LayerNodeSummary'

interface SceneNodeSelectProps {
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
  const [isRenaming, setIsRenaming] = createSignal(false)
  const [nameDraft, setNameDraft] = createSignal('')
  const part = createMemo(() => props.document.parts.find((part) => part.id === props.node.id))
  let nameInput: HTMLInputElement | undefined

  const startRenaming = (event: MouseEvent) => {
    if (props.locked || props.maskPicking) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    setNameDraft(props.node.name)
    setIsRenaming(true)
    queueMicrotask(() => {
      nameInput?.focus()
      nameInput?.select()
    })
  }

  const finishRenaming = () => {
    if (!isRenaming()) {
      return
    }

    const document = renameSceneNode(props.document, props.node.id, nameDraft())
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
    setIsRenaming(false)
  }

  return (
    <Show
      when={isRenaming()}
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
            onClick={(event) => props.onSelect(event, props.node)}
            onDblClick={startRenaming}
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
      <TextField class="puppet-layer-name-editor" value={nameDraft()} onChange={setNameDraft}>
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
          ref={(element) => {
            nameInput = element
          }}
          aria-label={`${props.node.name} ${props.node.kind === 'part' ? '파츠' : '그룹'} 이름`}
          onBlur={finishRenaming}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              finishRenaming()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setIsRenaming(false)
            }
          }}
        />
      </TextField>
    </Show>
  )
}
