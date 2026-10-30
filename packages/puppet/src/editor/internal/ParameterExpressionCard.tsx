import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import {For} from 'solid-js'
import {
  DEFAULT_PUPPET_EXPRESSION_FADE_TIME,
  PUPPET_EXPRESSION_BLENDS,
  type PuppetDocument,
  type PuppetExpression,
  type PuppetExpressionBlend,
  type PuppetExpressionParameter,
  type PuppetParameter,
} from '../../player'
import {
  removeExpression,
  removeExpressionParameter,
  renameExpression,
  setExpressionFade,
  setExpressionParameter,
} from './expressions'
import {PresetNameField} from './PresetNameField'

const FADE_STEP = 0.05

const BLEND_LABELS: Record<PuppetExpressionBlend, string> = {
  add: '더하기',
  multiply: '곱하기',
  overwrite: '덮어쓰기',
}

const isBlend = (value: string): value is PuppetExpressionBlend =>
  PUPPET_EXPRESSION_BLENDS.some((blend) => blend === value)

/** Value bounds that keep each blend's result reachable within the parameter range. */
const valueBounds = (parameter: PuppetParameter, blend: PuppetExpressionBlend) => {
  const span = parameter.maximum - parameter.minimum
  switch (blend) {
    case 'add':
      return {maximum: span, minimum: -span}
    case 'multiply':
      return {maximum: undefined, minimum: 0}
    case 'overwrite':
      return {maximum: parameter.maximum, minimum: parameter.minimum}
    default: {
      const exhaustive: never = blend
      return exhaustive
    }
  }
}

interface ParameterExpressionCardProps {
  readonly disabled: boolean
  readonly document: PuppetDocument
  readonly entry: PuppetExpressionParameter
  readonly expression: PuppetExpression
  readonly parameter: PuppetParameter
  readonly currentValue: number
  readonly apply: (document: PuppetDocument | undefined) => boolean
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  /** Called before a rename is applied, so the card keeps its key under the new ID. */
  readonly onRename?: (from: string, to: string) => void
}

export const ParameterExpressionCard = (props: ParameterExpressionCardProps) => {
  const bounds = () => valueBounds(props.parameter, props.entry.blend)
  const setEntry = (changes: Partial<PuppetExpressionParameter>) =>
    props.apply(
      setExpressionParameter(props.document, props.expression.id, {...props.entry, ...changes}),
    )
  const handleBlendChange = (value: string) => {
    if (!isBlend(value)) {
      return
    }
    // Start each blend from its identity so switching does not jump the pose.
    const initial = {add: 0, multiply: 1, overwrite: props.currentValue}[value]
    setEntry({blend: value, value: initial})
  }
  const fade = (property: 'fadeInTime' | 'fadeOutTime') =>
    props.expression[property] ?? DEFAULT_PUPPET_EXPRESSION_FADE_TIME

  return (
    <article class="entry-card">
      <header class="entry-card-header">
        <h3>{props.expression.id}</h3>
        <EditorButton
          aria-label={`${props.expression.id}에서 ${props.parameter.name} 제외`}
          class="entry-remove-button"
          disabled={props.disabled}
          title="이 표정에서 파라미터를 제외합니다."
          onClick={() =>
            props.apply(
              removeExpressionParameter(props.document, props.expression.id, props.parameter.id),
            )
          }
        >
          <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        </EditorButton>
      </header>
      <div class="entry-fields">
        <label>
          적용
          <EditorSelect
            disabled={props.disabled}
            label={`${props.expression.id} 적용 방식`}
            optionLabel={(value) => (isBlend(value) ? BLEND_LABELS[value] : value)}
            options={PUPPET_EXPRESSION_BLENDS}
            value={props.entry.blend}
            onChange={handleBlendChange}
          />
        </label>
        <label>
          값
          <EditorNumberField
            disabled={props.disabled}
            label={`${props.expression.id} 값`}
            maximum={bounds().maximum}
            minimum={bounds().minimum}
            name={`${props.expression.id}-${props.parameter.id}-value`}
            step="any"
            value={props.entry.value}
            onEditEnd={props.onEditEnd}
            onEditStart={props.onEditStart}
            onValueChange={(value) => setEntry({value})}
          />
        </label>
      </div>
      <details class="entry-settings">
        <summary>표정 설정</summary>
        <div class="entry-fields">
          <label>
            이름
            <PresetNameField
              disabled={props.disabled}
              label={`${props.expression.id} 이름`}
              value={props.expression.id}
              onRename={(name) => {
                const renamed = renameExpression(props.document, props.expression.id, name)
                if (renamed !== undefined) {
                  props.onRename?.(props.expression.id, renamed.id)
                }
                return props.apply(renamed?.document)
              }}
            />
          </label>
          <For each={['fadeInTime', 'fadeOutTime'] as const}>
            {(property) => (
              <label>
                {property === 'fadeInTime' ? '페이드 인' : '페이드 아웃'}
                <EditorNumberField
                  disabled={props.disabled}
                  label={`${props.expression.id} ${property === 'fadeInTime' ? '페이드 인' : '페이드 아웃'}(초)`}
                  minimum={0}
                  name={`${props.expression.id}-${property}`}
                  step={FADE_STEP}
                  value={fade(property)}
                  onEditEnd={props.onEditEnd}
                  onEditStart={props.onEditStart}
                  onValueChange={(seconds) =>
                    props.apply(
                      setExpressionFade(props.document, props.expression.id, {
                        [property]: seconds,
                      }),
                    )
                  }
                />
              </label>
            )}
          </For>
          <EditorButton
            class="entry-action-button"
            disabled={props.disabled}
            onClick={() => props.apply(removeExpression(props.document, props.expression.id))}
          >
            표정 삭제
          </EditorButton>
        </div>
      </details>
    </article>
  )
}
