import {Title} from '@solidjs/meta'

import * as m from '@paraglide/message'
import {LanguageLearningEditorContent} from '../../components/language-learning/EditorContent'

export default function LanguageLearningPage() {
  return (
    <>
      <Title>{`Pomofi — ${m.learning_editor_title()}`}</Title>
      <LanguageLearningEditorContent />
    </>
  )
}
