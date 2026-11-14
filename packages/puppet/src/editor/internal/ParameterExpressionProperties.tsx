import {EditorButton, EditorSelect} from '../../design-system'
import {createMemo, createSignal, Show} from 'solid-js'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument, PuppetParameter} from '../../player'
import {resolveParameterValue} from '../../player/parameter-value'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {addExpression, getParameterExpressions, setExpressionParameter} from './expressions'
import {KeyedFor} from './KeyedFor'
import {ParameterExpressionCard} from './ParameterExpressionCard'

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
                      <ParameterExpressionCard
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
