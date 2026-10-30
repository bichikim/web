import {EditorNumberField, EditorSelect} from '../../../design-system'
import {Show} from 'solid-js'
import {DEFAULT_PUPPET_POSE_FADE_TIME} from '../../../player'
import {EditorPropertyGroup} from '../EditorPropertyGroup'
import {addPartPoseGroup, getPartPose, setPartPose, updatePoseGroup} from '../pose-groups'
import {PresetNameField} from '../PresetNameField'
import type {PresetSectionProps} from './types'
import {CREATE, NONE, optionLabel} from './preset-options'

const FADE_STEP = 0.05

export const PartPoseSection = (props: PresetSectionProps) => {
  const pose = () => getPartPose(props.document, props.part.id)
  const parameters = () => props.document.parameters ?? []
  const poseParameter = () =>
    parameters().find((parameter) => parameter.id === pose()?.group.parameterId)
  const handlePoseChange = (value: string) => {
    const [firstParameter] = parameters()
    if (value === CREATE) {
      if (firstParameter !== undefined) {
        props.apply(addPartPoseGroup(props.document, props.part.id, firstParameter.id)?.document)
      }
      return
    }
    const group = props.document.poseGroups?.find((candidate) => candidate.id === value)
    const selector = parameters().find((parameter) => parameter.id === group?.parameterId)
    props.apply(
      setPartPose(
        props.document,
        props.part.id,
        group === undefined || selector === undefined
          ? undefined
          : {groupId: group.id, value: selector.defaultValue},
      ),
    )
  }
  return (
    <EditorPropertyGroup class="part-pose-properties" title="포즈">
      <label>
        그룹
        <EditorSelect
          disabled={props.disabled}
          label="파트 포즈 그룹"
          optionLabel={optionLabel('새 포즈 그룹')}
          options={[
            NONE,
            ...(props.document.poseGroups ?? []).map((group) => group.id),
            ...(parameters().length > 0 ? [CREATE] : []),
          ]}
          value={pose()?.group.id ?? NONE}
          onChange={handlePoseChange}
        />
      </label>
      <Show when={pose()}>
        {(current) => (
          <>
            <label>
              이름
              <PresetNameField
                disabled={props.disabled}
                label="포즈 그룹 이름"
                value={current().group.id}
                onRename={(id) =>
                  props.apply(updatePoseGroup(props.document, current().group.id, {id}))
                }
              />
            </label>
            <label>
              선택 파라미터
              <EditorSelect
                disabled={props.disabled}
                label="포즈 선택 파라미터"
                optionLabel={(id) =>
                  parameters().find((parameter) => parameter.id === id)?.name ?? id
                }
                options={parameters().map((parameter) => parameter.id)}
                value={current().group.parameterId}
                onChange={(parameterId) =>
                  props.apply(updatePoseGroup(props.document, current().group.id, {parameterId}))
                }
              />
            </label>
            <label>
              표시 값
              <EditorNumberField
                disabled={props.disabled}
                label="이 파트를 표시할 파라미터 값"
                maximum={poseParameter()?.maximum}
                minimum={poseParameter()?.minimum}
                name={`${props.part.id}-pose-value`}
                step="any"
                value={current().entry.value}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) =>
                  props.apply(
                    setPartPose(props.document, props.part.id, {
                      groupId: current().group.id,
                      value,
                    }),
                  )
                }
              />
            </label>
            <label>
              전환 시간
              <EditorNumberField
                disabled={props.disabled}
                label="포즈 전환 시간(초)"
                minimum={0}
                name={`${current().group.id}-pose-fade`}
                step={FADE_STEP}
                value={current().group.fadeTime ?? DEFAULT_PUPPET_POSE_FADE_TIME}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(fadeTime) =>
                  props.apply(updatePoseGroup(props.document, current().group.id, {fadeTime}))
                }
              />
            </label>
            <p class="parameter-section-summary">항목 {current().group.entries.length}개</p>
          </>
        )}
      </Show>
    </EditorPropertyGroup>
  )
}
