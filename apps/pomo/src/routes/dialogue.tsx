import {Title} from '@solidjs/meta'
import {useSearchParams} from '@solidjs/router'
import {DialogueEditorContent} from '../components/dialogue-page/EditorContent'

export default function PDialoguePage() {
  const [searchParams] = useSearchParams()
  const dialogueId = () => {
    const value = searchParams.dialogueId
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  return (
    <>
      <Title>{dialogueId() === null ? 'Pomofi — 대화 만들기' : 'Pomofi — 대화 편집하기'}</Title>
      <DialogueEditorContent dialogueId={dialogueId()} />
    </>
  )
}
