import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {For} from 'solid-js'

import {useEditorPortalMount} from '../../design-system'
import type {PuppetDocument} from '../../player'
import {type FlipReference, flipSceneNodes, getFlipBlocker} from './flip-nodes'

const FLIPS: ReadonlyArray<{
  readonly axis: 'x' | 'y'
  readonly label: string
  readonly reference: FlipReference
}> = [
  {axis: 'x', label: '좌우 반전 (선택 중심)', reference: 'selection'},
  {axis: 'y', label: '상하 반전 (선택 중심)', reference: 'selection'},
  {axis: 'x', label: '좌우 반전 (캔버스 중심)', reference: 'canvas'},
  {axis: 'y', label: '상하 반전 (캔버스 중심)', reference: 'canvas'},
]

export interface FlipSelectionMenuProps {
  readonly document: PuppetDocument
  readonly nodeIds: ReadonlyArray<string>
  readonly onDocumentChange: (document: PuppetDocument | undefined) => void
}

/**
 * Flips the selected layers with their contents, deformers and keyforms (Cubism's object flip),
 * across the selection's center or the canvas center.
 */
export const FlipSelectionMenu = (props: FlipSelectionMenuProps) => {
  const mount = useEditorPortalMount()
  const blocker = () => getFlipBlocker(props.document, props.nodeIds)
  return (
    <DropdownMenu modal={false} placement="bottom-start">
      <DropdownMenu.Trigger
        aria-label="선택 레이어 반전"
        class="container-kind-trigger"
        disabled={blocker() !== undefined}
        title={blocker() ?? '선택 레이어 반전'}
      >
        <span
          aria-hidden="true"
          class="puppet-icon puppet-icon-flip-horizontal layer-toolbar-icon puppet-layer-toolbar-icon"
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal mount={mount}>
        <DropdownMenu.Content class="kind-menu" aria-label="반전">
          <For each={FLIPS}>
            {(flip) => (
              <DropdownMenu.Item
                class="kind-menu-item"
                textValue={flip.label}
                onSelect={() => {
                  const result = flipSceneNodes({
                    axis: flip.axis,
                    document: props.document,
                    nodeIds: props.nodeIds,
                    reference: flip.reference,
                  })
                  props.onDocumentChange(result.ok ? result.document : undefined)
                }}
              >
                <DropdownMenu.ItemLabel>{flip.label}</DropdownMenu.ItemLabel>
              </DropdownMenu.Item>
            )}
          </For>
          <DropdownMenu.Separator class="editor-context-menu-separator" />
          <p class="kind-menu-note">
            안의 레이어·디포머와 키폼도 함께 뒤집어 움직임도 반대로 됩니다.
          </p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
