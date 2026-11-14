import type {PuppetMotion} from '../../player/document'
import type {MotionSettings as MotionSettingsValue} from './motion-settings'
import {CommitTextField} from './CommitTextField'

interface MotionNameFieldsProps {
  readonly disabled: boolean
  readonly motion: PuppetMotion | undefined
  readonly onApply: (changes: MotionSettingsValue) => void
}

/** Display name and motion group (Cubism's motion groups). */
export const MotionNameFields = (props: MotionNameFieldsProps) => (
  <>
    <label>
      표시 이름
      <CommitTextField
        disabled={props.disabled}
        label="모션 표시 이름"
        placeholder={props.motion?.id}
        value={props.motion?.name ?? ''}
        onCommit={(name) => props.onApply({name})}
      />
    </label>
    <label>
      모션 그룹
      <CommitTextField
        disabled={props.disabled}
        label="모션 그룹"
        placeholder="없음"
        value={props.motion?.group ?? ''}
        onCommit={(group) => props.onApply({group})}
      />
    </label>
  </>
)
