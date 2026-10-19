import {For, Show} from 'solid-js'

import {EditorButton, EditorNumberField} from '../../design-system'
import type {PuppetParameterValueMap} from '../../deformation'
import {PUPPET_VOWELS, type PuppetDocument} from '../../player'
import {DEFAULT_MOUTH_SHAPE_SMOOTHING} from '../../player/voice/mouth-shapes'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {setMouthShape, setMouthShapeSmoothing} from './mouth-shapes'

const VOWEL_LABELS = ['아', '이', '우', '에', '오'] as const
const VALUE_DIGITS = 2

export interface MouthShapePropertiesProps {
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  /** Current values, stored as a vowel's shape. */
  readonly parameterValues: PuppetParameterValueMap
}

/**
 * Each vowel's mouth shape for lip sync from audio (Cubism's MotionSync mappings): pose the mouth
 * parameters, then store their values for the vowel.
 */
export const MouthShapeProperties = (props: MouthShapePropertiesProps) => {
  const disabled = () => props.onDocumentChange === undefined
  const names = () =>
    props.document.mouthShapes?.parameterIds.map(
      (id) => props.document.parameters?.find((parameter) => parameter.id === id)?.name ?? id,
    ) ?? []
  return (
    <Show when={props.document.mouthShapes}>
      {(shapes) => (
        <EditorPropertyGroup
          class="parameter-properties"
          title="입 모양(모음)"
          tooltip="입 모양 파라미터를 모음 모양으로 맞춘 뒤 현재 값을 저장합니다. 재생할 때는 음성의 모음 비율만큼 섞고, 조용하면 원래 값으로 돌아갑니다."
        >
          <p class="parameter-section-summary">{names().join(', ')}</p>
          <For each={PUPPET_VOWELS}>
            {(vowel, index) => (
              <div class="editor-color-row">
                <span>
                  {VOWEL_LABELS[index()]}{' '}
                  {shapes()
                    .vowels[vowel].map((value) => value.toFixed(VALUE_DIGITS))
                    .join(' / ')}
                </span>
                <EditorButton
                  disabled={disabled()}
                  type="button"
                  onClick={() =>
                    props.onDocumentChange?.(
                      setMouthShape(props.document, vowel, props.parameterValues),
                    )
                  }
                >
                  {`${VOWEL_LABELS[index()]}: 현재 값 저장`}
                </EditorButton>
              </div>
            )}
          </For>
          <label>
            따라가는 시간
            <EditorNumberField
              disabled={disabled()}
              label="입 모양 따라가는 시간"
              minimum={0}
              name="mouth-shape-smoothing"
              step={0.01}
              unit="s"
              value={shapes().smoothing ?? DEFAULT_MOUTH_SHAPE_SMOOTHING}
              onEditEnd={props.onEditEnd}
              onEditStart={props.onEditStart}
              onValueChange={(smoothing) =>
                props.onDocumentChange?.(setMouthShapeSmoothing(props.document, smoothing))
              }
            />
          </label>
        </EditorPropertyGroup>
      )}
    </Show>
  )
}
