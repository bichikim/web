import {Popover} from '@kobalte/core/popover'
import {createMemo, createSignal, For, Show} from 'solid-js'

import {getPartRenderProperties} from '../../deformation'
import type {PuppetPart, PuppetPartRenderProperties} from '../../player'

export interface PartMaskOption {
  readonly disabled: boolean
  readonly label: string
  readonly part: PuppetPart
}

export interface PartMaskPropertiesProps {
  readonly maskPartOptions: ReadonlyArray<PartMaskOption>
  readonly maskPicking?: boolean
  readonly maskUsageCount?: number
  readonly part: PuppetPart
  readonly staticDisabled: boolean
  readonly onMaskPickCancel?: () => void
  readonly onMaskPickStart?: (partId: string) => void
  readonly onStaticChange: (properties: PuppetPartRenderProperties) => void
}

interface MaskPickerProps {
  readonly disabled: boolean
  readonly maskIds: ReadonlyArray<string>
  readonly options: ReadonlyArray<PartMaskOption>
  readonly selectedCount: number
  readonly onMaskChange: (partId: string, checked: boolean) => void
}

const MaskPicker = (props: MaskPickerProps) => {
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
        <span aria-hidden="true">＋</span>
        마스크 추가
      </Popover.Trigger>
      <Popover.Content class="mask-picker">
        <div class="mask-picker-heading">
          <Popover.Title>마스크 추가</Popover.Title>
          <Popover.CloseButton aria-label="마스크 선택기 닫기">×</Popover.CloseButton>
        </div>
        <input
          aria-label="마스크 검색"
          placeholder="레이어 이름 또는 ID 검색"
          type="search"
          value={query()}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        <div class="mask-picker-list">
          <For
            each={filteredOptions()}
            fallback={<p class="mask-picker-empty">일치하는 파츠가 없습니다.</p>}
          >
            {(option) => (
              <label
                title={
                  option.disabled ? '이 파트를 마스크로 지정하면 순환 참조가 생깁니다.' : undefined
                }
              >
                <input
                  aria-label={`${option.label}로 자르기`}
                  checked={props.maskIds.includes(option.part.id)}
                  disabled={props.disabled || option.disabled}
                  type="checkbox"
                  onChange={(event) =>
                    props.onMaskChange(option.part.id, event.currentTarget.checked)
                  }
                />
                <span class="mask-picker-thumbnail" aria-hidden="true">
                  <img alt="" src={option.part.texture.src} />
                </span>
                <span class="mask-picker-label">
                  <strong>{option.label}</strong>
                  <small>{option.part.id}</small>
                </span>
                <Show when={option.disabled}>
                  <small class="mask-picker-reason">순환 참조</small>
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
  const selectedOptions = createMemo(() => {
    const maskIds = new Set(properties().clippingMaskIds)
    return props.maskPartOptions.filter((option) => maskIds.has(option.part.id))
  })
  const handleMaskChange = (partId: string, checked: boolean) => {
    const maskIds = properties().clippingMaskIds
    props.onStaticChange({
      clippingMaskIds: checked
        ? maskIds.includes(partId)
          ? maskIds
          : [...maskIds, partId]
        : maskIds.filter((id) => id !== partId),
    })
  }

  return (
    <>
      <fieldset class="part-mask-properties">
        <legend>이 파트를 자르는 마스크</legend>
        <div class="mask-chip-list">
          <Show
            when={selectedOptions().length > 0}
            fallback={<span class="mask-empty-state">적용된 마스크 없음</span>}
          >
            <For each={selectedOptions()}>
              {(option) => (
                <span class="mask-chip">
                  <img alt="" src={option.part.texture.src} />
                  <span>{option.label}</span>
                  <button
                    aria-label={`${option.label} 마스크 제거`}
                    disabled={props.staticDisabled}
                    type="button"
                    onClick={() => handleMaskChange(option.part.id, false)}
                  >
                    ×
                  </button>
                </span>
              )}
            </For>
          </Show>
        </div>
        <div class="mask-actions">
          <MaskPicker
            disabled={props.staticDisabled}
            maskIds={properties().clippingMaskIds}
            options={props.maskPartOptions}
            selectedCount={selectedOptions().length}
            onMaskChange={handleMaskChange}
          />
          <Show when={props.onMaskPickStart !== undefined}>
            <button
              class="mask-action-button"
              disabled={props.staticDisabled}
              type="button"
              onClick={() =>
                props.maskPicking
                  ? props.onMaskPickCancel?.()
                  : props.onMaskPickStart?.(props.part.id)
              }
            >
              {props.maskPicking ? '마스크 선택 취소' : '레이어에서 마스크 선택'}
            </button>
          </Show>
        </div>
      </fieldset>
      <fieldset class="part-mask-properties">
        <legend>이 파트를 마스크로 사용할 때</legend>
        <Show when={(props.maskUsageCount ?? 0) > 0}>
          <span class="mask-usage-count">{props.maskUsageCount}개 파츠에서 사용 중</span>
        </Show>
        <label>
          <input
            checked={properties().invertedMask}
            disabled={props.staticDisabled}
            type="checkbox"
            onChange={(event) => props.onStaticChange({invertedMask: event.currentTarget.checked})}
          />
          마스크 반전
        </label>
        <label>
          <input
            checked={properties().renderWhenUsedAsMask}
            disabled={props.staticDisabled}
            type="checkbox"
            onChange={(event) =>
              props.onStaticChange({renderWhenUsedAsMask: event.currentTarget.checked})
            }
          />
          파츠도 계속 표시
        </label>
      </fieldset>
    </>
  )
}
