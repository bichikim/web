import {preventInternalDismiss} from '../../../design-system/prevent-internal-dismiss'
import {EditorCheckbox, EditorTextInput} from '../../../design-system'
import {TextField} from '@kobalte/core/text-field'
import {Popover} from '@kobalte/core/popover'
import {createMemo, createSignal, For, Show} from 'solid-js'
import type {MaskTargetOption} from './types'

interface PartMaskTargetPickerProps {
  readonly disabled: boolean
  readonly targetIds: ReadonlyArray<string>
  readonly options: ReadonlyArray<MaskTargetOption>
  readonly selectedCount: number
  readonly onTargetChange: (partId: string, checked: boolean) => void
}

export const PartMaskTargetPicker = (props: PartMaskTargetPickerProps) => {
  let surface: HTMLDivElement | undefined
  const [query, setQuery] = createSignal('')
  const filteredOptions = createMemo(() => {
    const normalizedQuery = query().trim().toLocaleLowerCase()
    return normalizedQuery.length === 0
      ? props.options
      : props.options.filter(
          (option) =>
            option.label.toLocaleLowerCase().includes(normalizedQuery) ||
            option.part.id.toLocaleLowerCase().includes(normalizedQuery),
        )
  })

  return (
    <Popover onOpenChange={(open) => open && setQuery('')}>
      <Popover.Trigger class="mask-action-button" disabled={props.disabled}>
        <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
        대상 추가
      </Popover.Trigger>
      <Popover.Content
        ref={(element) => {
          surface = element
        }}
        onInteractOutside={(event) => preventInternalDismiss(event, surface)}
        class="mask-picker"
      >
        <div class="mask-picker-heading">
          <Popover.Title>대상 추가</Popover.Title>
          <Popover.CloseButton aria-label="대상 선택기 닫기">
            <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
          </Popover.CloseButton>
        </div>
        <TextField value={query()} onChange={setQuery}>
          <EditorTextInput
            aria-label="적용 대상 검색"
            placeholder="레이어 이름 또는 ID 검색"
            type="search"
          />
        </TextField>
        <div class="mask-picker-list">
          <For
            each={filteredOptions()}
            fallback={<p class="mask-picker-empty">일치하는 파츠가 없습니다.</p>}
          >
            {(option) => (
              <label title={option.disabled ? option.reason : undefined}>
                <EditorCheckbox
                  label={`${option.label}에 마스크 적용`}
                  checked={props.targetIds.includes(option.part.id)}
                  disabled={props.disabled || option.disabled}
                  onChange={(checked) => props.onTargetChange(option.part.id, checked)}
                />
                <span class="mask-picker-thumbnail" aria-hidden="true">
                  <img alt="" src={option.part.texture.src} />
                </span>
                <span class="mask-picker-label">
                  <strong>{option.label}</strong>
                  <small>{option.part.id}</small>
                </span>
                <Show when={option.disabled}>
                  <small class="mask-picker-reason">{option.reason}</small>
                </Show>
              </label>
            )}
          </For>
        </div>
        <span class="mask-picker-count">{props.selectedCount}개 적용</span>
      </Popover.Content>
    </Popover>
  )
}
