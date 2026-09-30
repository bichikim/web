import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {For} from 'solid-js'

import {EditorButton, useEditorPortalMount} from '../../design-system'
import type {PuppetParameter} from '../../player'

export interface TimelineParameterPickerProps {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly onAdd?: (parameterId: string) => void
}

export const TimelineParameterPicker = (props: TimelineParameterPickerProps) => {
  const mount = useEditorPortalMount()

  return (
    <DropdownMenu modal={false} placement="bottom-start">
      <DropdownMenu.Trigger
        as={EditorButton}
        aria-label="타임라인 파라미터 추가"
        disabled={props.onAdd === undefined || props.parameters.length === 0}
      >
        <span aria-hidden="true" class="puppet-icon puppet-icon-plus" /> 파라미터 추가
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal mount={mount}>
        <DropdownMenu.Content
          aria-label="추가할 파라미터"
          class="editor-context-menu-content timeline-parameter-picker-list"
        >
          <For each={props.parameters}>
            {(parameter) => (
              <DropdownMenu.Item
                class="editor-context-menu-item"
                onSelect={() => props.onAdd?.(parameter.id)}
              >
                <DropdownMenu.ItemLabel>{parameter.name}</DropdownMenu.ItemLabel>
              </DropdownMenu.Item>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
