import {EditorButton, EditorNumberField} from '../../design-system'
import {createSignal} from 'solid-js'

import type {PuppetDocument, PuppetLayerOrderRule} from '../../player'
import {LayerOrderParameterPicker} from './LayerOrderParameterPicker'
import {LayerOrderReferencePicker} from './LayerOrderReferencePicker'
import {getSceneNode} from './scene-graph'

export interface LayerOrderRuleEditorProps {
  readonly document: PuppetDocument
  readonly initialRule: PuppetLayerOrderRule
  readonly onCancel: () => void
  readonly onSave: (rule: PuppetLayerOrderRule) => void
  readonly selectedPartIds: ReadonlyArray<string>
}

const getSelectedTargets = (document: PuppetDocument, selectedPartIds: ReadonlyArray<string>) => {
  const knownIds = new Set(document.parts.map((part) => part.id))
  return [...new Set(selectedPartIds.filter((id) => knownIds.has(id)))]
}

export const LayerOrderRuleEditor = (props: LayerOrderRuleEditorProps) => {
  const [draft, setDraft] = createSignal(props.initialRule)
  const referenceOptions = () =>
    props.document.parts.filter((part) => !draft().partIds.includes(part.id))
  const selectedTargets = () => getSelectedTargets(props.document, props.selectedPartIds)
  const canUseSelection = () =>
    selectedTargets().length > 0 && !selectedTargets().includes(draft().referencePartId)
  const canSave = () =>
    draft().partIds.length > 0 &&
    referenceOptions().some((part) => part.id === draft().referencePartId) &&
    draft().when.parameterIds.length > 0 &&
    Number.isFinite(draft().when.threshold)
  const updateCondition = (when: Partial<PuppetLayerOrderRule['when']>) =>
    setDraft((rule) => ({...rule, when: {...rule.when, ...when}}))
  const handleSave = () => {
    if (canSave()) {
      props.onSave(draft())
    }
  }
  const handleCancel = () => {
    setDraft(props.initialRule)
    props.onCancel()
  }

  return (
    <div class="grid gap-3 pt-3 text-[0.6875rem] text-[#cbd7d3]">
      <div class="grid gap-1">
        <span class="text-[#84918c]">이동할 파츠</span>
        <p class="m-0 break-words leading-relaxed">
          {draft()
            .partIds.map((id) => getSceneNode(props.document, id)?.name ?? id)
            .join(', ')}
        </p>
        <EditorButton
          class="justify-self-start"
          disabled={!canUseSelection()}
          onClick={() => setDraft((rule) => ({...rule, partIds: selectedTargets()}))}
        >
          현재 선택으로 교체
        </EditorButton>
      </div>
      <LayerOrderReferencePicker
        document={props.document}
        targetIds={draft().partIds}
        value={draft().referencePartId}
        onChange={(referencePartId) => setDraft((rule) => ({...rule, referencePartId}))}
      />
      <LayerOrderParameterPicker
        parameterIds={draft().when.parameterIds}
        parameters={props.document.parameters ?? []}
        onChange={(parameterIds) => updateCondition({parameterIds})}
      />
      <div class="grid gap-2">
        <label class="grid gap-1">
          <span class="text-[#84918c]">조건</span>
          <select
            aria-label="전환 조건"
            class="w-full min-w-0 rounded border border-[#35413d] bg-[#121816] p-2 text-[#dfe8e4]"
            value={draft().when.comparison}
            onChange={(event) =>
              updateCondition({
                comparison: event.currentTarget.value as PuppetLayerOrderRule['when']['comparison'],
              })
            }
          >
            <option value="greater-than">초과하면</option>
            <option value="less-than">미만이면</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-[#84918c]">전환 기준값</span>
          <EditorNumberField
            label="전환 기준값"
            step={1}
            value={draft().when.threshold}
            onValueChange={(threshold) => updateCondition({threshold})}
          />
        </label>
      </div>
      <label class="grid gap-1">
        <span class="text-[#84918c]">기준 파츠보다</span>
        <select
          aria-label="전환 후 위치"
          class="w-full min-w-0 rounded border border-[#35413d] bg-[#121816] p-2 text-[#dfe8e4]"
          value={draft().placement}
          onChange={(event) =>
            setDraft((rule) => ({
              ...rule,
              placement: event.currentTarget.value as PuppetLayerOrderRule['placement'],
            }))
          }
        >
          <option value="before">뒤에 표시</option>
          <option value="after">앞에 표시</option>
        </select>
      </label>
      <div class="flex flex-wrap gap-2">
        <EditorButton disabled={!canSave()} onClick={handleSave}>
          규칙 저장
        </EditorButton>
        <EditorButton onClick={handleCancel}>취소</EditorButton>
      </div>
    </div>
  )
}
