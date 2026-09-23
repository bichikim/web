import {EditorButton} from '../../design-system'
import {createSignal, For, Show} from 'solid-js'

import type {PuppetDocument, PuppetLayerOrderRule} from '../../player'
import {LayerOrderRuleEditor} from './LayerOrderRuleEditor'
import {getSceneNode} from './scene-graph'

export interface LayerOrderPropertiesProps {
  readonly document: PuppetDocument
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly selectedPartIds: ReadonlyArray<string>
}

const getRuleSummary = (document: PuppetDocument, rule: PuppetLayerOrderRule) => {
  const firstName = getSceneNode(document, rule.partIds[0]!)?.name ?? rule.partIds[0]!
  const targetName =
    rule.partIds.length === 1 ? firstName : `${firstName} 외 ${rule.partIds.length - 1}개`
  const comparison = rule.when.comparison === 'greater-than' ? '>' : '<'
  const position = rule.placement === 'before' ? '뒤' : '앞'
  const referenceName = getSceneNode(document, rule.referencePartId)?.name ?? rule.referencePartId
  const conditionLabel = `${rule.when.parameterIds.length}개 값 ${comparison} ${rule.when.threshold}`
  return `${targetName} · ${conditionLabel} → ${referenceName} ${position}`
}

const getSelectedTargets = (document: PuppetDocument, selectedPartIds: ReadonlyArray<string>) => {
  const knownIds = new Set(document.parts.map((part) => part.id))
  return [...new Set(selectedPartIds.filter((id) => knownIds.has(id)))]
}

export const LayerOrderProperties = (props: LayerOrderPropertiesProps) => {
  const [adding, setAdding] = createSignal(false)
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
      parameterIds: [],
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

  return (
    <details class="deformer-properties text-[#cbd7d3]">
      <summary class="cursor-pointer text-xs font-semibold text-[#bfeee1]">
        레이어 순서 규칙 · {props.document.layerOrderRules?.length ?? 0}개
      </summary>
      <p class="m-0 text-[0.6875rem] leading-relaxed text-[#9caca6]">
        기본은 왼쪽 목록 순서입니다. 조건이 맞을 때만 지정한 파츠를 앞이나 뒤로 옮깁니다. 규칙은
        위에서 아래 순서로 적용됩니다.
      </p>
      <For each={props.document.layerOrderRules ?? []}>
        {(rule, index) => (
          <details class="rounded border border-[#35413d] px-3 py-2">
            <summary class="cursor-pointer break-words text-xs font-medium text-[#dfe8e4]">
              {getRuleSummary(props.document, rule)}
            </summary>
            <LayerOrderRuleEditor
              document={props.document}
              initialRule={rule}
              selectedPartIds={props.selectedPartIds}
              onCancel={() => undefined}
              onSave={(updated) => saveRule(index(), updated)}
            />
            <div class="mt-2 flex flex-wrap gap-1">
              <EditorButton
                aria-label="규칙 위로"
                disabled={index() === 0}
                onClick={() => moveRule(index(), index() - 1)}
              >
                ↑
              </EditorButton>
              <EditorButton
                aria-label="규칙 아래로"
                disabled={index() === (props.document.layerOrderRules?.length ?? 0) - 1}
                onClick={() => moveRule(index(), index() + 1)}
              >
                ↓
              </EditorButton>
              <EditorButton onClick={() => deleteRule(index())}>규칙 삭제</EditorButton>
            </div>
          </details>
        )}
      </For>
      <Show when={adding() && canAdd()}>
        <div class="rounded border border-[#3d5f56] px-3 pb-3">
          <h3 class="mb-0 text-xs">새 레이어 순서 규칙</h3>
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
        <p class="m-0 text-[0.6875rem] text-[#9caca6]">
          왼쪽 레이어 목록에서 이동할 파츠를 선택하세요.
        </p>
      </Show>
    </details>
  )
}
