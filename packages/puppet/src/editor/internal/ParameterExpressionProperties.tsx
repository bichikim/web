import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import {createMemo, createSignal, For, Show} from 'solid-js'

import type {PuppetParameterValueMap} from '../../deformation'
import {
  DEFAULT_PUPPET_EXPRESSION_FADE_TIME,
  PUPPET_EXPRESSION_BLENDS,
  type PuppetDocument,
  type PuppetExpression,
  type PuppetExpressionBlend,
  type PuppetExpressionParameter,
  type PuppetParameter,
} from '../../player'
import {resolveParameterValue} from '../../player/parameter-value'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {
  addExpression,
  getParameterExpressions,
  removeExpression,
  removeExpressionParameter,
  renameExpression,
  setExpressionFade,
  setExpressionParameter,
} from './expressions'
import {KeyedFor} from './KeyedFor'
import {PresetNameField} from './PresetNameField'

export interface ParameterExpressionPropertiesProps {
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly parameterIds: ReadonlyArray<string>
  readonly parameterValues?: PuppetParameterValueMap
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
}

const CREATE = '\u0000create'
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

interface ExpressionCardProps {
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

const ExpressionCard = (props: ExpressionCardProps) => {
  const caption = () => props.expression.name ?? props.expression.id
  const nameField = () => (props.expression.name === undefined ? '이름' : 'ID')
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
        <h3>{caption()}</h3>
        <EditorButton
          aria-label={`${caption()}에서 ${props.parameter.name} 제외`}
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
            label={`${caption()} 적용 방식`}
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
            label={`${caption()} 값`}
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
            {nameField()}
            <PresetNameField
              disabled={props.disabled}
              label={`${caption()} ${nameField()}`}
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

/** Expressions that set the selected parameters. */
export const ParameterExpressionProperties = (props: ParameterExpressionPropertiesProps) => {
  const disabled = () => props.disabled === true || props.onDocumentChange === undefined
  const apply = (document: PuppetDocument | undefined) => {
    if (document !== undefined && !disabled()) {
      props.onDocumentChange?.(document)
    }
    return document !== undefined
  }
  const parameters = () =>
    props.parameterIds.flatMap((id) => {
      const parameter = props.document.parameters?.find((candidate) => candidate.id === id)
      return parameter === undefined ? [] : [parameter]
    })
  const currentValue = (parameter: PuppetParameter) =>
    resolveParameterValue(parameter, props.parameterValues?.[parameter.id])
  const addTo = (parameter: PuppetParameter, value: string) => {
    if (value === CREATE) {
      apply(addExpression(props.document, parameter.id, currentValue(parameter))?.document)
      return
    }
    apply(
      setExpressionParameter(props.document, value, {
        blend: 'overwrite',
        parameterId: parameter.id,
        value: currentValue(parameter),
      }),
    )
  }

  return (
    <EditorPropertyGroup class="parameter-expression-properties" title="표정">
      <KeyedFor each={parameters()} key={(parameter) => parameter.id}>
        {(current) => {
          const entries = () => getParameterExpressions(props.document, current().id)
          const available = () =>
            (props.document.expressions ?? [])
              .filter((expression) => !entries().some((item) => item.expression === expression))
              .map((expression) => expression.id)
          const [requestedTarget, setRequestedTarget] = createSignal(CREATE)
          // Card keys follow renames, so a renamed card keeps its focus and open settings while a
          // deleted card unmounts. Each key belongs to one expression ID at a time, and only IDs
          // still shown keep one.
          let pendingRename: {readonly from: string; readonly to: string} | undefined
          let nextCardKey = 0
          const cardKeys = createMemo<ReadonlyMap<string, string>>((previous) => {
            const ids = entries().map((item) => item.expression.id)
            const rename = pendingRename
            pendingRename = undefined
            const inherited = (id: string) =>
              rename?.to === id && !ids.includes(rename.from)
                ? previous.get(rename.from)
                : undefined
            return new Map(
              ids.map((id) => [
                id,
                previous.get(id) ?? inherited(id) ?? `card-${(nextCardKey += 1)}`,
              ]),
            )
          }, new Map())
          const moveCardKey = (from: string, to: string) => {
            pendingRename = {from, to}
          }
          // Fall back to a new expression once the requested one already uses the parameter.
          const target = () =>
            available().includes(requestedTarget()) ? requestedTarget() : CREATE
          return (
            <>
              <div class="entry-header">
                <span>
                  {parameters().length > 1 ? `${current().name} · ` : ''}표정 {entries().length}개
                </span>
              </div>
              <Show
                when={entries().length > 0}
                fallback={<p class="entry-empty">이 파라미터를 바꾸는 표정이 없습니다.</p>}
              >
                <div class="entry-card-list">
                  <KeyedFor
                    each={entries()}
                    key={(item) => cardKeys().get(item.expression.id) ?? item.expression.id}
                  >
                    {(item) => (
                      <ExpressionCard
                        apply={apply}
                        currentValue={currentValue(current())}
                        disabled={disabled()}
                        document={props.document}
                        entry={item().entry}
                        expression={item().expression}
                        parameter={current()}
                        onEditEnd={props.onEditEnd}
                        onEditStart={props.onEditStart}
                        onRename={moveCardKey}
                      />
                    )}
                  </KeyedFor>
                </div>
              </Show>
              <div class="entry-header">
                <EditorSelect
                  disabled={disabled()}
                  label={`${current().name}을(를) 추가할 표정`}
                  optionLabel={(value) => (value === CREATE ? '새 표정' : value)}
                  options={[...available(), CREATE]}
                  value={target()}
                  onChange={setRequestedTarget}
                />
                <EditorButton
                  class="entry-action-button"
                  disabled={disabled()}
                  onClick={() => addTo(current(), target())}
                >
                  <span aria-hidden="true" class="puppet-icon puppet-icon-plus" />
                  표정에 추가
                </EditorButton>
              </div>
            </>
          )
        }}
      </KeyedFor>
    </EditorPropertyGroup>
  )
}
