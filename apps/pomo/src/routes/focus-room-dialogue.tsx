import {Title} from '@solidjs/meta'
import {useSearchParams} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'

const FocusRoomDialogueEditor = clientOnly(
  () => import('../components/FocusRoomDialogueEditor.client'),
  {lazy: true},
)

export default function FocusRoomDialoguePage() {
  const [searchParams] = useSearchParams()
  const dialogueId = () => {
    const value = searchParams.dialogueId
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  return (
    <>
      <Title>Pomo — 대화 만들기</Title>
      <FocusRoomDialogueEditor dialogueId={dialogueId()} />
    </>
  )
}
