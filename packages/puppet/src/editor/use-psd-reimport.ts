import {type Accessor, createMemo, createSignal, onCleanup} from 'solid-js'
import type {PuppetDocument} from '../player/document'
import {removeParts} from './internal/remove-parts'
import {getPsdErrorMessage, importPsd, type ImportPsdResult} from './import-psd'
import {
  applyPsdReimport,
  createPsdReimportPlan,
  type PsdReimportPlan,
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
type ReimportState = ReimportReview | ReimportLoading | ReimportError | {readonly kind: 'idle'}
interface PsdReimportOptions {
  readonly readPsd?: (file: File) => Promise<ImportPsdResult>
  readonly document: Accessor<PuppetDocument>
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: (message: string) => void
}

export const usePsdReimport = (options: PsdReimportOptions) => {
  const [state, setState] = createSignal<ReimportState>({kind: 'idle'})
  const [includeNew, setIncludeNew] = createSignal(false)
  const [removeMissing, setRemoveMissing] = createSignal(false)
  const selection = createMemo(() => {
    const current = state()
    return selectPsdReimportOperations({
      includeNew: includeNew(),
      rows: current.kind === 'review' ? current.plan.rows : [],
      removeMissing: removeMissing(),
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
    const document = options.document()
    setIncludeNew(false)
    setRemoveMissing(false)
    setState({fileName: file.name, kind: 'loading'})
    try {
      const result = await (options.readPsd ?? importPsd)(file)
      if (revision !== generation) {
        return
      }
      if (document !== options.document()) {
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
    if (review.plan.document !== options.document()) {
      setState({kind: 'error', message: '문서가 변경되었습니다. PSD를 다시 선택하세요.'})
      return
    }
    const selected = selection()
    if (selected.count === 0) {
      return
    }
    const updated = applyPsdReimport({...review.plan, rows: selected.selectedRows}, true)
    const result = removeParts(updated, selected.removedIds)
    if (!result.ok) {
      setState({
        kind: 'error',
        message:
          '레이어 연결을 유지할 수 없어 적용하지 않았습니다. 원본의 마스크 관계를 확인하세요.',
      })
      return
    }
    options.onDocumentChange(result.document)
    options.onNotice('PSD의 그림을 갱신했습니다. 실행 취소로 이전 상태를 복원할 수 있습니다.')
    cancel()
  }
  return {
    removeMissing,
    selection,
    includeNew,
    selectSource,
    apply,
    cancel,
    setRemoveMissing,
    load,
    setIncludeNew,
    state,
  }
}
export type PsdReimportController = ReturnType<typeof usePsdReimport>
