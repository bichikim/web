import {Title} from '@solidjs/meta'
import {useSearchParams} from '@solidjs/router'
import {clientOnly} from '@solidjs/start'

const PDialogueEditor = clientOnly(() => import('../../components/PDialogueEditor'), {
  lazy: true,
})

export default function PDialoguePage() {
  const [searchParams] = useSearchParams()
  const dialogueId = () => {
    const value = searchParams.dialogueId
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  return (
    <>
      <Title>Pomo — 대화 만들기</Title>
      <PDialogueEditor dialogueId={dialogueId()} />
    </>
  )
}
