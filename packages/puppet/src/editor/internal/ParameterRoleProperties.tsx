import {For} from 'solid-js'

import {EditorCheckbox, EditorSelect} from '../../design-system'
import type {PuppetDocument} from '../../player/document'
import {CommitTextField} from './CommitTextField'
import {EditorPropertyGroup} from './EditorPropertyGroup'
import {setMouthShapeParameter} from './mouth-shapes'
import {
  addParameterGroup,
  type ParameterRole,
  setParameterGroup,
  setParameterRole,
} from './parameter-roles'

export interface ParameterRolePropertiesProps {
  readonly document: PuppetDocument
  readonly parameterIds: ReadonlyArray<string>
  readonly onDocumentChange?: (document: PuppetDocument) => void
}

const ROLES: ReadonlyArray<{readonly label: string; readonly role: ParameterRole}> = [
  {label: '자동 눈 깜빡임', role: 'eyeBlink'},
  {label: '립싱크', role: 'lipSync'},
]
const NO_GROUP = ''

/**
 * Automatic-effect roles (Cubism's EyeBlink and LipSync groups) and the display group of each
 * selected parameter.
 */
export const ParameterRoleProperties = (props: ParameterRolePropertiesProps) => {
  const parameters = () =>
    props.parameterIds.flatMap((id) => {
      const parameter = props.document.parameters?.find((candidate) => candidate.id === id)
      return parameter === undefined ? [] : [parameter]
    })
  const disabled = () => props.onDocumentChange === undefined
  const groupIds = () => [
    NO_GROUP,
    ...(props.document.parameterGroups ?? []).map((group) => group.id),
  ]
  const groupName = (id: string) =>
    props.document.parameterGroups?.find((group) => group.id === id)?.name ?? '없음'
  return (
    <EditorPropertyGroup class="parameter-properties" title="역할과 분류">
      <For each={parameters()}>
        {(parameter) => (
          <>
            <For each={ROLES}>
              {({label, role}) => (
                <div class="editor-color-row">
                  <span>{label}</span>
                  <EditorCheckbox
                    checked={props.document.parameterRoles?.[role]?.includes(parameter.id) === true}
                    disabled={disabled()}
                    label={`${parameter.name} ${label}`}
                    onChange={(enabled) =>
                      props.onDocumentChange?.(
                        setParameterRole(props.document, parameter.id, role, enabled),
                      )
                    }
                  />
                </div>
              )}
            </For>
            <div class="editor-color-row">
              <span>입 모양(모음)</span>
              <EditorCheckbox
                checked={props.document.mouthShapes?.parameterIds.includes(parameter.id) === true}
                disabled={disabled()}
                label={`${parameter.name} 입 모양(모음)`}
                onChange={(enabled) =>
                  props.onDocumentChange?.(
                    setMouthShapeParameter(props.document, parameter.id, enabled),
                  )
                }
              />
            </div>
            <label>
              <span>{parameter.name} 그룹</span>
              <EditorSelect
                disabled={disabled()}
                label={`${parameter.name} 그룹`}
                optionLabel={groupName}
                options={groupIds()}
                value={parameter.groupId ?? NO_GROUP}
                onChange={(id) =>
                  props.onDocumentChange?.(
                    setParameterGroup(
                      props.document,
                      parameter.id,
                      id === NO_GROUP ? undefined : id,
                    ),
                  )
                }
              />
            </label>
            <CommitTextField
              disabled={disabled()}
              label={`${parameter.name} 새 그룹 이름`}
              placeholder="새 그룹 이름"
              value=""
              onCommit={(name) => {
                const added = addParameterGroup(props.document, name)
                if (added !== undefined) {
                  props.onDocumentChange?.(
                    setParameterGroup(added.document, parameter.id, added.id),
                  )
                }
              }}
            />
          </>
        )}
      </For>
      <p class="parameter-section-summary">
        눈 깜빡임 대상은 기본값이 뜬 눈이고 범위의 반대쪽 끝이 감은 눈입니다. 립싱크 대상에는 입
        크기가 더해집니다. 입 모양 대상은 음성의 모음(아·이·우·에·오)에 따라 정해 둔 값으로
        바뀝니다.
      </p>
    </EditorPropertyGroup>
  )
}
