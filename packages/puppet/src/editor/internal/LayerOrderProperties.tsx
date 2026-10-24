import {EditorButton} from '../../design-system'
import {createSignal, For, Show} from 'solid-js'

import type {PuppetDocument, PuppetLayerOrderRule} from '../../player'
import {resolveParameterValue} from '../../player/parameter-value'
import type {PuppetParameterValueMap} from '../../deformation'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {LayerOrderRuleEditor} from './LayerOrderRuleEditor'
import {getSceneNode} from './scene-graph'

export interface LayerOrderPropertiesProps {
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly selectedPartIds: ReadonlyArray<string>
  readonly parameterIds?: ReadonlyArray<string>
  readonly parameterValues?: PuppetParameterValueMap
}

const getRuleSummary = (document: PuppetDocument, rule: PuppetLayerOrderRule) => {
  const firstName = getSceneNode(document, rule.partIds[0]!)?.name ?? rule.partIds[0]!
  const targetName =
    rule.partIds.length === 1 ? firstName : `${firstName} 외 ${rule.partIds.length - 1}개`
  const comparison = rule.when.comparison === 'greater-than' ? '초과' : '미만'
  const position = rule.placement === 'before' ? '뒤' : '앞'
  const referenceName = getSceneNode(document, rule.referencePartId)?.name ?? rule.referencePartId
  const parameterNames = rule.when.parameterIds.map(
    (id) => document.parameters?.find((parameter) => parameter.id === id)?.name ?? id,
  )
  const parameterLabel = parameterNames.join(' + ') + (parameterNames.length > 1 ? ' 합계' : '')
  const conditionLabel = `${parameterLabel} ${rule.when.threshold} ${comparison}`
  return {conditionLabel, placementLabel: `${referenceName} ${position}로`, targetName}
}

const getSelectedTargets = (document: PuppetDocument, selectedPartIds: ReadonlyArray<string>) => {
  const knownIds = new Set(document.parts.map((part) => part.id))
  return [...new Set(selectedPartIds.filter((id) => knownIds.has(id)))]
}

export const LayerOrderProperties = (props: LayerOrderPropertiesProps) => {
  const [adding, setAdding] = createSignal(false)
  const visibleRules = () =>
    (props.document.layerOrderRules ?? [])
      .map((rule, index) => ({index, rule}))
      .filter(
        ({rule}) =>
          props.parameterIds === undefined ||
          rule.when.parameterIds.some((id) => props.parameterIds?.includes(id)),
      )
  const ruleTotal = (rule: PuppetLayerOrderRule) => {
    const {parameters} = props.document
    const values = props.parameterValues
    return rule.when.parameterIds.reduce((sum, id) => {
      const parameter = parameters?.find((candidate) => candidate.id === id)
      return sum + (parameter === undefined ? 0 : resolveParameterValue(parameter, values?.[id]))
    }, 0)
  }
  const ruleActive = (rule: PuppetLayerOrderRule) =>
    rule.when.comparison === 'greater-than'
      ? ruleTotal(rule) > rule.when.threshold
      : ruleTotal(rule) < rule.when.threshold
  const activeCount = () => visibleRules().filter(({rule}) => ruleActive(rule)).length
  const selectedTargets = () => getSelectedTargets(props.document, props.selectedPartIds)
  const canAdd = () =>
    selectedTargets().length > 0 &&
    props.document.parts.some((part) => !selectedTargets().includes(part.id)) &&
    (props.document.parameters?.length ?? 0) > 0
  const initialRule = (): PuppetLayerOrderRule => ({
    partIds: selectedTargets(),
    placement: 'before',
    referencePartId: '',
    when: {
      comparison: 'greater-than',
      parameterIds: props.parameterIds ?? [],
      threshold: 0,
    },
  })
  const saveRule = (index: number | null, rule: PuppetLayerOrderRule) => {
    const rules = [...(props.document.layerOrderRules ?? [])]
    if (index === null) {
      rules.push(rule)
    } else {
      rules[index] = rule
    }
    props.onDocumentChange?.({...props.document, layerOrderRules: rules})
    setAdding(false)
  }
  const deleteRule = (index: number) =>
    props.onDocumentChange?.({
      ...props.document,
      layerOrderRules: props.document.layerOrderRules?.filter(
        (_, candidate) => candidate !== index,
      ),
    })
  const moveRule = (index: number, destination: number) => {
    const rules = [...(props.document.layerOrderRules ?? [])]
    if (destination < 0 || destination >= rules.length) {
      return
    }
    const current = rules[index]!
    rules[index] = rules[destination]!
    rules[destination] = current
    props.onDocumentChange?.({...props.document, layerOrderRules: rules})
  }
  const adjacentRule = (index: number, offset: number) => {
    const visibleIndex = visibleRules().findIndex((item) => item.index === index)
    return visibleRules()[visibleIndex + offset]?.index
  }

  return (
    <EditorPropertyGroup class="order-rule-panel" title="표시 순서">
      <div class="order-rule-list">
        <p class="parameter-section-summary">
          규칙 {visibleRules().length}개 · 현재{' '}
          {activeCount() === 0 ? '적용 안 됨' : `${activeCount()}개 적용 중`}
        </p>
        <For each={visibleRules()}>
          {({rule, index}) => {
            const summary = () => getRuleSummary(props.document, rule)
            return (
              <details class="order-rule-rule">
                <summary
                  class="order-rule-summary"
                  aria-label={`${summary().targetName} · ${summary().placementLabel}. ${summary().conditionLabel}`}
                >
                  <span class="order-rule-summary-content">
                    <strong>
                      {summary().targetName} → {summary().placementLabel}
                    </strong>
                    <span class="order-rule-condition">{summary().conditionLabel}</span>
                    <span class="order-rule-state" data-active={ruleActive(rule)}>
                      현재 {rule.when.parameterIds.length > 1 ? '합계' : '값'} {ruleTotal(rule)} ·{' '}
                      {ruleActive(rule) ? '조건 충족' : '조건 미충족'}
                    </span>
                  </span>
                </summary>
                <LayerOrderRuleEditor
                  document={props.document}
                  initialRule={rule}
                  selectedPartIds={props.selectedPartIds}
                  onCancel={() => undefined}
                  onSave={(updated) => saveRule(index, updated)}
                />
                <div class="order-rule-actions">
                  <EditorButton
                    aria-label="규칙 위로"
                    disabled={adjacentRule(index, -1) === undefined}
                    onClick={() => moveRule(index, adjacentRule(index, -1) ?? index)}
                  >
                    ↑
                  </EditorButton>
                  <EditorButton
                    aria-label="규칙 아래로"
                    disabled={adjacentRule(index, 1) === undefined}
                    onClick={() => moveRule(index, adjacentRule(index, 1) ?? index)}
                  >
                    ↓
                  </EditorButton>
                  <EditorButton onClick={() => deleteRule(index)}>규칙 삭제</EditorButton>
                </div>
              </details>
            )
          }}
        </For>
        <Show when={adding() && canAdd()}>
          <div class="order-rule-rule">
            <h3 class="order-rule-heading">새 레이어 순서 규칙</h3>
            <LayerOrderRuleEditor
              document={props.document}
              initialRule={initialRule()}
              selectedPartIds={props.selectedPartIds}
              onCancel={() => setAdding(false)}
              onSave={(rule) => saveRule(null, rule)}
            />
          </div>
        </Show>
        <Show when={!adding()}>
          <EditorButton disabled={!canAdd()} onClick={() => setAdding(true)}>
            선택 파츠로 규칙 추가
          </EditorButton>
        </Show>
        <Show when={selectedTargets().length === 0}>
          <p class="order-rule-hint">왼쪽 레이어 목록에서 이동할 파츠를 선택하세요.</p>
        </Show>
      </div>
    </EditorPropertyGroup>
  )
}
