import {type Accessor, createEffect, getOwner} from 'solid-js'
import {Compartment, type Extension} from '@codemirror/state'
import type {EditorView} from '@codemirror/view'
import type {ChangeHunk, ChangeKind} from '../../shared/change-contracts'
import {createChangeGutter} from './create-change-gutter'
import {useTranslations} from '../locale/use-translations'
import {createChangeInspection} from './create-change-inspection'
import type {InlineChange} from '../types'

interface UseEditorChangesProps {
  readonly view: Accessor<EditorView | undefined>
  readonly hunks: Accessor<readonly ChangeHunk[]>
  readonly onOpen?: (hunk: ChangeHunk) => void
  readonly inspection: Accessor<InlineChange | null>
  readonly onClose: () => void
  readonly onNavigate: (index: number) => void
}
/** Reconfigures only the change gutter when its baseline, draft or language changes. */
export const useEditorChanges = (props: UseEditorChangesProps): (() => Extension) => {
  const t = useTranslations()
  const compartment = new Compartment()
  const owner = getOwner()
  const extension = (): Extension => {
    const inspection = props.inspection()
    return [
      props.onOpen === undefined
        ? []
        : createChangeGutter({
            expanded: inspection?.hunks[inspection.active],
            hunks: props.hunks(),
            labels: {
              added: t('추가 변경 보기'),
              deleted: t('삭제 변경 보기'),
              modified: t('수정 변경 보기'),
            },
            onOpen: props.onOpen,
          }),
      inspection === null
        ? []
        : createChangeInspection({
            inspection,
            onClose: props.onClose,
            onNavigate: props.onNavigate,
            owner,
          }),
    ]
  }
  createEffect(() => {
    const view = props.view()
    const current = extension()
    view?.dispatch({effects: compartment.reconfigure(current)})
  })
  return () => compartment.of(extension())
}
