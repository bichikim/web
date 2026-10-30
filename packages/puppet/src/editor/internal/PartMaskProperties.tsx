import {EditorButton, EditorCheckbox} from '../../design-system'
import {createMemo, For, Show} from 'solid-js'
import {getPartRenderProperties} from '../../deformation'
import type {PuppetPart, PuppetPartRenderProperties} from '../../player'
import type {MaskTargetOption} from './part-mask/types'
import {PartMaskTargetPicker} from './part-mask/PartMaskTargetPicker'

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
                  <EditorButton
                    aria-label={`${option.label} 적용 해제`}
                    disabled={props.staticDisabled || option.disabled}
                    type="button"
                    onClick={() => handleTargetChange(option.part.id, false)}
                  >
                    <span aria-hidden="true" class="puppet-icon puppet-icon-mask-unlink" />
                  </EditorButton>
                </span>
              )}
            </For>
          </Show>
        </div>
        <div class="mask-actions">
          <PartMaskTargetPicker
            disabled={props.staticDisabled}
            targetIds={selectedOptions().map((option) => option.part.id)}
            options={props.maskTargetOptions}
            selectedCount={selectedOptions().length}
            onTargetChange={handleTargetChange}
          />
          <Show when={props.onMaskPickStart !== undefined}>
            <EditorButton
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
            </EditorButton>
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

export type {MaskTargetOption} from './part-mask/types'
