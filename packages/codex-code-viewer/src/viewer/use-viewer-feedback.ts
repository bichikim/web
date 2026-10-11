import {type Accessor, batch, createEffect, on} from 'solid-js'
import type {DefinitionFeedback} from './use-definition-navigation'
import {useNotice} from './use-notice'

interface ViewerFeedbackOptions {
  readonly definition: Accessor<DefinitionFeedback | null>
  readonly editing: Accessor<string | null>
  readonly clearDefinition: () => void
  readonly clearEditing: () => void
}
const definitionMessage = (feedback: DefinitionFeedback): string =>
  feedback.kind === 'missing'
    ? '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.'
    : '이동할 정의를 선택하세요.'

/** Exposes the current editing, navigation or general feedback independently of the selected address. */
export const useViewerFeedback = (options: ViewerFeedbackOptions) => {
  const notification = useNotice()
  const clear = (): void => {
    options.clearDefinition()
    options.clearEditing()
  }
  createEffect(
    on(options.definition, (value) => {
      if (value !== null) {
        options.clearEditing()
        notification.dismiss()
      }
    }),
  )
  createEffect(
    on(options.editing, (value) => {
      if (value !== null) {
        options.clearDefinition()
        notification.dismiss()
      }
    }),
  )
  return {
    dismiss: () =>
      batch(() => {
        clear()
        notification.dismiss()
      }),
    notice: () => {
      const editing = options.editing()
      const definition = options.definition()
      return editing === null
        ? definition === null
          ? notification.notice()
          : {message: definitionMessage(definition)}
        : {message: editing}
    },
    notify: (message: string) =>
      batch(() => {
        clear()
        notification.notify(message)
      }),
  }
}
