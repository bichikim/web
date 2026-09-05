import {EditorCheckbox} from './EditorCheckbox'
import {TextField} from '@kobalte/core/text-field'
import {Button} from '@kobalte/core/button'
import {Popover} from '@kobalte/core/popover'
import {createMemo, createSignal, For, Show} from 'solid-js'

import {getPartRenderProperties} from '../../deformation'
import type {PuppetPart, PuppetPartRenderProperties} from '../../player'

export interface MaskTargetOption {
  readonly disabled: boolean
  readonly reason?: string
  readonly label: string
  readonly part: PuppetPart
}

export interface PartMaskPropertiesProps {
  readonly maskTargetOptions: ReadonlyArray<MaskTargetOption>
  readonly maskPicking?: boolean
  readonly part: PuppetPart
  readonly staticDisabled: boolean
  readonly onMaskTargetChange?: (partId: string, checked: boolean) => void
  readonly onMaskPickCancel?: () => void
  readonly onMaskPickStart?: (partId: string) => void
  readonly onStaticChange: (properties: PuppetPartRenderProperties) => void
}

interface MaskTargetPickerProps {
  readonly disabled: boolean
  readonly targetIds: ReadonlyArray<string>
  readonly options: ReadonlyArray<MaskTargetOption>
  readonly selectedCount: number
  readonly onTargetChange: (partId: string, checked: boolean) => void
}

const MaskTargetPicker = (props: MaskTargetPickerProps) => {
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
      <Popover.Content class="mask-picker">
        <div class="mask-picker-heading">
          <Popover.Title>대상 추가</Popover.Title>
          <Popover.CloseButton aria-label="대상 선택기 닫기">
            <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
          </Popover.CloseButton>
        </div>
        <TextField value={query()} onChange={setQuery}>
          <TextField.Input
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

export const PartMaskProperties = (props: PartMaskPropertiesProps) => {
  const properties = () => getPartRenderProperties(props.part)
  const selectedOptions = createMemo(() =>
    props.maskTargetOptions.filter((option) =>
      option.part.properties?.clippingMaskIds?.includes(props.part.id),
    ),
  )
  const handleTargetChange = (partId: string, checked: boolean) =>
    props.onMaskTargetChange?.(partId, checked)

  return (
    <>
      <fieldset class="part-mask-properties">
        <legend>마스크 적용 대상</legend>
        <div class="mask-chip-list">
          <Show
            when={selectedOptions().length > 0}
            fallback={<span class="mask-empty-state">적용 대상 없음</span>}
          >
            <For each={selectedOptions()}>
              {(option) => (
                <span class="mask-chip">
                  <img alt="" src={option.part.texture.src} />
                  <span>{option.label}</span>
                  <Button
                    aria-label={`${option.label} 적용 해제`}
                    disabled={props.staticDisabled || option.disabled}
                    type="button"
                    onClick={() => handleTargetChange(option.part.id, false)}
                  >
                    <span aria-hidden="true" class="puppet-icon puppet-icon-x" />
                  </Button>
                </span>
              )}
            </For>
          </Show>
        </div>
        <div class="mask-actions">
          <MaskTargetPicker
            disabled={props.staticDisabled}
            targetIds={selectedOptions().map((option) => option.part.id)}
            options={props.maskTargetOptions}
            selectedCount={selectedOptions().length}
            onTargetChange={handleTargetChange}
          />
          <Show when={props.onMaskPickStart !== undefined}>
            <Button
              class="mask-action-button"
              disabled={props.staticDisabled}
              type="button"
              onClick={() =>
                props.maskPicking
                  ? props.onMaskPickCancel?.()
                  : props.onMaskPickStart?.(props.part.id)
              }
            >
              {props.maskPicking ? '대상 선택 취소' : '레이어에서 선택'}
            </Button>
          </Show>
        </div>
        <label>
          <EditorCheckbox
            label="마스크 반전"
            checked={properties().invertedMask}
            disabled={props.staticDisabled}
            onChange={(checked) => props.onStaticChange({invertedMask: checked})}
          />
          마스크 반전
        </label>
        <label>
          <EditorCheckbox
            label="이 파트도 표시"
            checked={properties().renderWhenUsedAsMask}
            disabled={props.staticDisabled}
            onChange={(checked) => props.onStaticChange({renderWhenUsedAsMask: checked})}
          />
          이 파트도 표시
        </label>
      </fieldset>
    </>
  )
}
