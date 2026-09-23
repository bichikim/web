import * as m from '@paraglide/message'
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
      <Title>
        {dialogueId() === null ? m.dialogue_page_new_title() : m.dialogue_page_edit_title()}
      </Title>
      <DialogueEditorContent dialogueId={dialogueId()} />
    </>
  )
}
