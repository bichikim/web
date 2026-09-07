import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {useEditorPortalMount} from './EditorPortalProvider'
import {For} from 'solid-js'
import type {PuppetDocument, PuppetSceneNode} from '../../player'
import {
  convertSceneContainers,
  getContainerKind,
  type SceneContainerConversionTarget,
} from './container-conversion'
import {LayerContainerIcon} from './LayerContainerIcon'

interface ContainerKindSelectProps {
  readonly document: PuppetDocument
  readonly node: PuppetSceneNode
  readonly onSelect?: (event: MouseEvent) => void
  readonly disabled?: boolean
  readonly onDocumentChange?: (document: PuppetDocument) => void
}
const kinds: ReadonlyArray<{value: SceneContainerConversionTarget; label: string}> = [
  {label: '일반 그룹', value: 'group'},
  {label: '자유 변형 디포머', value: 'deformer'},
  {label: '곡선 디포머', value: 'curve'},
  {label: '본 디포머', value: 'bone'},
  {label: '핀 디포머', value: 'pin'},
]
export const ContainerKindSelect = (props: ContainerKindSelectProps) => {
  const mount = useEditorPortalMount()
  const change = (value: string) => {
    const kind = kinds.find((kind) => kind.value === value)
    if (kind === undefined) {
      return
    }
    const document = convertSceneContainers({
      document: props.document,
      nodeIds: [props.node.id],
      targetKind: kind.value,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  return (
    <DropdownMenu modal={false} placement="bottom-start">
      <DropdownMenu.Trigger
        class="container-kind-trigger"
        aria-label={`${props.node.name} 종류 변경`}
        disabled={props.disabled}
        onClick={(event) => props.onSelect?.(event)}
      >
        <LayerContainerIcon
          pin={getContainerKind(props.node) === 'pin'}
          kind={props.node.kind === 'deformer' ? 'deformer' : 'group'}
          bone={getContainerKind(props.node) === 'bone'}
          curve={getContainerKind(props.node) === 'curve'}
        />
        <span aria-hidden="true" class="kind-chevron puppet-icon puppet-icon-chevron-down" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal mount={mount}>
        <DropdownMenu.Content class="kind-menu" aria-label="레이어 종류">
          <DropdownMenu.Group>
            <DropdownMenu.GroupLabel class="kind-menu-heading">레이어 종류</DropdownMenu.GroupLabel>
            <DropdownMenu.RadioGroup value={getContainerKind(props.node)} onChange={change}>
              <For each={kinds}>
                {(kind) => (
                  <DropdownMenu.RadioItem
                    value={kind.value}
                    class="kind-menu-item"
                    textValue={kind.label}
                  >
                    <LayerContainerIcon
                      kind={kind.value === 'group' ? 'group' : 'deformer'}
                      pin={kind.value === 'pin'}
                      bone={kind.value === 'bone'}
                      curve={kind.value === 'curve'}
                    />
                    <DropdownMenu.ItemLabel>{kind.label}</DropdownMenu.ItemLabel>
                    <DropdownMenu.ItemIndicator class="kind-check">
                      <span aria-hidden="true" class="puppet-icon puppet-icon-check" />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.RadioItem>
                )}
              </For>
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Group>
          <DropdownMenu.Separator class="editor-context-menu-separator" />
          <p class="kind-menu-note">종류를 바꾸면 이 디포머의 변형과 키폼 연결이 초기화됩니다.</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
