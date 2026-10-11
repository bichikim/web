import {type Accessor, createEffect} from 'solid-js'
import {Compartment, type Extension} from '@codemirror/state'
import {EditorView} from '@codemirror/view'
import {useTranslations} from '../locale/use-translations'

/** Provides editor accessibility attributes that follow the viewer language. */
export const useEditorAccessibility = (
  view: Accessor<EditorView | undefined>,
): Accessor<Extension> => {
  const t = useTranslations()
  const compartment = new Compartment()
  const attributes = (): Extension =>
    EditorView.contentAttributes.of({
      'aria-label': t('코드 편집기'),
      'aria-multiline': 'true',
      role: 'textbox',
      spellcheck: 'false',
    })
  createEffect(() => {
    const editor = view()
    const extension = attributes()
    editor?.dispatch({effects: compartment.reconfigure(extension)})
  })
  return () => compartment.of(attributes())
}
