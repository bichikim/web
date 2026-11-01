import {EditorSelect} from '../../../design-system'
import {Show} from 'solid-js'
import {EditorPropertyGroup} from '../EditorPropertyGroup'
import {addPartHitArea, getPartHitArea, renameHitArea, setPartHitArea} from '../hit-areas'
import {PresetNameField} from '../PresetNameField'
import type {PresetSectionProps} from './types'
import {CREATE, NONE, optionLabel} from './preset-options'

export const PartHitAreaSection = (props: PresetSectionProps) => {
  const area = () => getPartHitArea(props.document, props.part.id)
  const handleAreaChange = (value: string) => {
    if (value === CREATE) {
      props.apply(addPartHitArea(props.document, props.part.id)?.document)
    } else {
      props.apply(setPartHitArea(props.document, props.part.id, value === NONE ? undefined : value))
    }
  }
  return (
    <EditorPropertyGroup class="part-hit-area-properties" title="히트 영역">
      <label>
        영역
        <EditorSelect
          disabled={props.disabled}
          label="파트 히트 영역"
          optionLabel={optionLabel('새 영역')}
          options={[NONE, ...(props.document.hitAreas ?? []).map((item) => item.id), CREATE]}
          value={area()?.id ?? NONE}
          onChange={handleAreaChange}
        />
      </label>
      <Show when={area()}>
        {(current) => (
          <>
            <label>
              이름
              <PresetNameField
                disabled={props.disabled}
                label="히트 영역 이름"
                value={current().id}
                onRename={(name) => props.apply(renameHitArea(props.document, current().id, name))}
              />
            </label>
            <p class="parameter-section-summary">파트 {current().partIds.length}개</p>
          </>
        )}
      </Show>
    </EditorPropertyGroup>
  )
}
