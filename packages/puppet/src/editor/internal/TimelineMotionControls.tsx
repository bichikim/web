import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {createSignal, Show} from 'solid-js'

import {EditorButton, EditorSelect, useEditorPortalMount} from '../../design-system'
import {MotionNameEditor} from './MotionNameEditor'

export interface TimelineMotionControlsProps {
  readonly editableMotionId?: string
  readonly motionIds: ReadonlyArray<string>
  readonly onAdd?: () => void
  readonly onDelete?: () => void
  readonly onDuplicate?: () => void
  readonly onRename?: (name: string) => void
  readonly onViewChange: (value: string) => void
  readonly options: ReadonlyArray<string>
  readonly value?: string
}

export const TimelineMotionControls = (props: TimelineMotionControlsProps) => {
  const mount = useEditorPortalMount()
  const [renaming, setRenaming] = createSignal(false)
  const canManage = () => props.editableMotionId !== undefined && props.onRename !== undefined

  return (
    <div class="timeline-motion-controls">
      <Show
        when={
          renaming() && props.editableMotionId !== undefined ? props.editableMotionId : undefined
        }
        fallback={
          <>
            <EditorSelect
              label="모션 선택"
              options={props.options}
              value={props.value}
              disabled={props.options.length === 0}
              onChange={props.onViewChange}
            />
            <EditorButton
              aria-label="모션 추가"
              class="timeline-motion-add"
              disabled={props.onAdd === undefined}
              onClick={() => props.onAdd?.()}
            >
              <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
            </EditorButton>
            <DropdownMenu modal={false} placement="bottom-end">
              <DropdownMenu.Trigger
                as={EditorButton}
                aria-label="모션 관리"
                class="timeline-motion-manage"
                disabled={!canManage()}
              >
                <span aria-hidden="true">•••</span>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal mount={mount}>
                <DropdownMenu.Content aria-label="모션 관리" class="editor-context-menu-content">
                  <DropdownMenu.Item
                    class="editor-context-menu-item"
                    disabled={props.onDuplicate === undefined}
                    onSelect={() => props.onDuplicate?.()}
                  >
                    <DropdownMenu.ItemLabel>복제</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    class="editor-context-menu-item"
                    onSelect={() => setRenaming(true)}
                  >
                    <DropdownMenu.ItemLabel>이름 변경</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator class="editor-context-menu-separator" />
                  <DropdownMenu.Item
                    class="editor-context-menu-item danger"
                    disabled={props.onDelete === undefined}
                    onSelect={() => props.onDelete?.()}
                  >
                    <DropdownMenu.ItemLabel>삭제</DropdownMenu.ItemLabel>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
          </>
        }
      >
        {(motionId) => (
          <MotionNameEditor
            motionId={motionId()}
            motionIds={props.motionIds}
            onCancel={() => setRenaming(false)}
            onRename={(name) => {
              props.onRename?.(name)
              setRenaming(false)
            }}
          />
        )}
      </Show>
    </div>
  )
}
