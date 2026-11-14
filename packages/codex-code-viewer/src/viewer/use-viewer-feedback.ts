import {type Accessor, batch, createEffect, on} from 'solid-js'
import type {DefinitionFeedback} from './use-definition-navigation'
import {useNotice} from './use-notice'

interface UseViewerFeedbackProps {
  readonly definition: Accessor<DefinitionFeedback | null>
  readonly editing: Accessor<string | null>
  readonly clearDefinition: () => void
  readonly clearEditing: () => void
}
/** Exposes the current editing, navigation or general feedback independently of the selected address. */
export const useViewerFeedback = (props: UseViewerFeedbackProps) => {
  const notification = useNotice()
  const clear = (): void => {
    props.clearDefinition()
    props.clearEditing()
  }
  createEffect(
    on(props.definition, (value) => {
      if (value !== null) {
        props.clearEditing()
        notification.dismiss()
      }
    }),
  )
  createEffect(
    on(props.editing, (value) => {
      if (value !== null) {
        props.clearDefinition()
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
      const editing = props.editing()
      const definition = props.definition()
      if (editing !== null) {
        return {message: editing}
      }
      if (definition === null) {
        return notification.notice()
      }
      return definition.kind === 'missing'
        ? {message: '이동 대상이 없습니다. 작업 폴더 밖의 정의는 표시하지 않습니다.'}
        : null
    },
    notify: (message: string) =>
      batch(() => {
        clear()
        notification.notify(message)
      }),
  }
}
