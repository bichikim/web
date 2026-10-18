import {useLocalDate} from 'src/features/civil-date'
import {type ReminderDraft, ReminderFields} from './ReminderFields'

interface MemoryMemoReminderFieldsProps {
  /** 열린 모달의 최신 알림 초안을 읽습니다. */
  readonly draft: () => ReminderDraft
  /** 사용자가 변경한 알림 초안을 상위 소유자에게 전달합니다. */
  readonly onChange: (draft: ReminderDraft) => void
}

export const MemoryMemoReminderFields = (props: MemoryMemoReminderFieldsProps) => {
  const minimumDate = useLocalDate({initialDate: new Date()})

  return (
    <ReminderFields draft={props.draft} minimumDate={minimumDate()} onChange={props.onChange} />
  )
}
