import {type Accessor, createMemo, createSignal, onCleanup} from 'solid-js'
import type {PuppetDocument} from '../player/document'
import {removeParts} from './internal/remove-parts'
import {getPsdErrorMessage, importPsd, type ImportPsdResult} from './import-psd'
import {
  applyPsdReimport,
  createPsdReimportPlan,
  type PsdReimportPlan,
  type PsdReimportSelection,
  selectPsdReimportOperations,
} from './internal/psd-reimport'

export interface ReimportReview {
  readonly kind: 'review'
  readonly fileName: string
  readonly plan: PsdReimportPlan
  readonly warnings: ReadonlyArray<string>
}
export interface ReimportLoading {
  readonly kind: 'loading'
  readonly fileName: string
}
export interface ReimportError {
  readonly kind: 'error'
  readonly message: string
}
export type ReimportState =
  | ReimportReview
  | ReimportLoading
  | ReimportError
  | {readonly kind: 'idle'}
export interface UsePsdReimportProps {
  readonly readPsd?: (file: File) => Promise<ImportPsdResult>
  readonly document: Accessor<PuppetDocument>
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: (message: string) => void
}

export interface PsdReimportDialogController {
  readonly apply: () => void
  readonly cancel: () => void
  readonly includeNew: Accessor<boolean>
  readonly removeMissing: Accessor<boolean>
  readonly selectSource: (id: string) => void
  readonly selection: Accessor<PsdReimportSelection>
  readonly setIncludeNew: (value: boolean) => void
  readonly setRemoveMissing: (value: boolean) => void
  readonly state: Accessor<ReimportState>
}

export interface PsdReimportController extends PsdReimportDialogController {
  readonly load: (file: File | undefined) => Promise<void>
}

export const usePsdReimport = (props: UsePsdReimportProps): PsdReimportController => {
  const [state, setState] = createSignal<ReimportState>({kind: 'idle'})
  const [includeNew, setIncludeNew] = createSignal(false)
  const [removeMissing, setRemoveMissing] = createSignal(false)
  const selection = createMemo(() => {
    const current = state()
    return selectPsdReimportOperations({
      includeNew: includeNew(),
      removeMissing: removeMissing(),
      rows: current.kind === 'review' ? current.plan.rows : [],
    })
  })
  let generation = 0
  onCleanup(() => {
    generation += 1
  })
  const cancel = () => {
    generation += 1
    setState({kind: 'idle'})
  }
  const load = async (file: File | undefined) => {
    if (file === undefined) {
      return
    }
    generation += 1
    const revision = generation
    const document = props.document()
    setIncludeNew(false)
    setRemoveMissing(false)
    setState({fileName: file.name, kind: 'loading'})
    try {
      const result = await (props.readPsd ?? importPsd)(file)
      if (revision !== generation) {
        return
      }
      if (document !== props.document()) {
        setState({
          kind: 'error',
          message: '불러오는 동안 문서가 변경되었습니다. PSD를 다시 선택하세요.',
        })
        return
      }
      setState(
        result.ok
          ? {
              fileName: file.name,
              kind: 'review',
              plan: createPsdReimportPlan(document, result.document),
              warnings: result.warnings,
            }
          : {kind: 'error', message: getPsdErrorMessage(result.error.code)},
      )
    } catch {
      if (revision === generation) {
        setState({kind: 'error', message: 'PSD를 읽지 못했습니다. 파일을 다시 선택하세요.'})
      }
    }
  }
  const selectSource = (id: string) => {
    const review = state()
    if (review.kind !== 'review') {
      return
    }
    setIncludeNew(false)
    setRemoveMissing(false)
    setState({
      ...review,
      plan: createPsdReimportPlan(review.plan.document, review.plan.incoming, id),
    })
  }
  const apply = () => {
    const review = state()
    if (review.kind !== 'review') {
      return
    }
    if (review.plan.document !== props.document()) {
      setState({kind: 'error', message: '문서가 변경되었습니다. PSD를 다시 선택하세요.'})
      return
    }
    const selected = selection()
    if (selected.view.count === 0) {
      return
    }
    const updated = applyPsdReimport({...review.plan, rows: selected.operations.rows})
    const result = removeParts(updated, selected.operations.removedPartIds)
    if (!result.ok) {
      setState({
        kind: 'error',
        message:
          '레이어 연결을 유지할 수 없어 적용하지 않았습니다. 원본의 마스크 관계를 확인하세요.',
      })
      return
    }
    props.onDocumentChange(result.document)
    props.onNotice('PSD의 그림을 갱신했습니다. 실행 취소로 이전 상태를 복원할 수 있습니다.')
    cancel()
  }
  return {
    apply,
    cancel,
    includeNew,
    load,
    removeMissing,
    selection,
    selectSource,
    setIncludeNew,
    setRemoveMissing,
    state,
  }
}
