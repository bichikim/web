import type {ChangePreview, FileBaseline, WorkspaceChanges} from '../shared/change-contracts'
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {
  CodeLocation,
  NavigationGroup,
  NavigationLocation,
  ViewerConnection,
  WorkspaceEntry,
  WorkspaceSession,
} from '../shared/contracts'
import type {DraftStorage} from './drafts/types'
import type {TreeState} from '../shared/tree-state'
import type {MemoPatch, MemoState} from '../shared/memo-state'
import type {Accessor} from 'solid-js'

export interface MemoSwipePoint {
  readonly pointer: number
  readonly x: number
  readonly y: number
}
export interface MemoSwipeStart extends MemoSwipePoint {
  readonly offset: number
}
export interface MemoSwipePosition {
  readonly extent: number
  readonly offset: number
}
export interface MemoSwipeEnd extends MemoSwipePosition {
  readonly pointer: number
}
export interface MemoSwipeMotion {
  readonly capture: boolean
  readonly offset: number
}
export interface MemoSwipeWheel {
  readonly horizontal: number
  readonly vertical: number
  readonly zoom: boolean
}
export interface MemoSwipeTouch {
  readonly touches: number
  readonly interactive: boolean
}
export interface MemoSwipeRelease {
  readonly remaining: number
  readonly centered: boolean
}
export interface UseMemoSwipeProps {
  readonly disabled?: Accessor<boolean>
  readonly onAttach?: () => Promise<void>
  readonly onRemove?: () => Promise<boolean>
}
export interface MemoSwipe {
  readonly blocked: Accessor<boolean>
  readonly dragging: Accessor<boolean>
  readonly pending: Accessor<boolean>
  readonly resetRevision: Accessor<number>
  readonly cancel: () => void
  readonly startPointer: (point: MemoSwipeStart) => boolean
  readonly movePointer: (point: MemoSwipePoint) => MemoSwipeMotion | null
  readonly endPointer: (position: MemoSwipeEnd) => Promise<void>
  readonly cancelPointer: (pointer: number) => void
  readonly wheel: (input: MemoSwipeWheel) => void
  readonly startTouch: (input: MemoSwipeTouch) => void
  readonly endTouch: (input: MemoSwipeRelease) => void
  readonly endNative: (position: MemoSwipePosition) => Promise<void>
}

export interface InlineChange extends ChangePreview {
  readonly active: number
  readonly source: string
}

export interface DeletedDocument {
  readonly base: string | null
  readonly path: string
  readonly source: string | null
}

export interface DeletedDocumentView {
  readonly document: DeletedDocument
  readonly draftSource?: string
  readonly editing?: boolean
  readonly pending?: boolean
  readonly saving?: boolean
  readonly onChange?: (source: string) => void
  readonly onClose?: () => void
  readonly onSave?: () => void
  readonly onToggleEditing?: () => void
}

export interface ChangeRow {
  readonly kind: 'context' | 'added' | 'deleted'
  readonly previous: number | null
  readonly current: number | null
  readonly text: string
}

export interface SyntaxSpan {
  readonly offset: number
  readonly text: string
  readonly classes: string
}

export interface CodeSelection extends CodeLocation {
  endLine: number
  /** Exclusive endpoint; omitted for a whole-line selection. */
  endColumn?: number
}

export interface CodeTextRange {
  line: number
  column: number
  endLine: number
  endColumn: number
}

export interface CodeSnippet extends CodeSelection {
  readonly kind: 'code'
  readonly text: string
}

export interface Notice {
  message: string
}

export interface WorkspaceSelection {
  readonly kind: 'file' | 'directory'
  readonly path: string
}
export interface FileMutation {
  readonly action: 'copy' | 'cut' | 'delete' | 'rename'
  readonly source: string
  readonly entry: WorkspaceEntry
}

export interface CodeChanges {
  readonly kind: 'changes'
  readonly path: string
  readonly revision: string
  readonly patch: string
}

export type ViewerContext = CodeSelection | CodeSnippet | WorkspaceSelection | CodeChanges

export interface ContextMenuItem {
  readonly group?: string
  readonly description?: string
  readonly label: string
  readonly separatorBefore?: boolean
  readonly shortcut?: string
  readonly key?: string
  readonly onSelect?: () => void
}

export interface ContextMenuCloseOptions {
  restoreFocus?: boolean
}

export interface NavigationOptions {
  deleted?: boolean
  historyIndex?: number
  preserveSelection?: boolean
  restoreView?: boolean
}

export interface ViewerSettingsEnvironment {
  readonly navigator?: Pick<Navigator, 'language'>
  readonly localStorage?: Pick<Storage, 'getItem' | 'setItem'>
}

export interface ViewerPort {
  readonly readMemos?: () => Promise<MemoState>
  readonly saveMemos?: (patch: MemoPatch) => Promise<MemoState>
  readonly addTextContext?: (text: string) => Promise<void>
  readonly readChanges?: (session: string) => Promise<WorkspaceChanges>
  readonly readBaseline?: (session: string, path: string) => Promise<FileBaseline>
  /** 현재 채팅의 파일트리 상태를 저장합니다. 미지원 호스트에서는 생략합니다. */
  readonly saveTreeState?: (session: string, patch: TreeState) => Promise<void>
  /** 현재 채팅의 작업 폴더를 저장하고 연결합니다. 미지원 호스트에서는 생략합니다. */
  readonly changeWorkspace?: (path: string) => Promise<WorkspaceSession>
  /** 절대 경로를 호스트의 기본 뷰어로 엽니다. 미지원 통합에서는 생략합니다. */
  readonly openFile?: (path: string) => Promise<void>
  readonly draftStorage?: DraftStorage
  copyContextFiles?(): Promise<void>
  attachContextFiles?(): Promise<void>
  attachSelection?(selection: ViewerContext): Promise<void>
  subscribeContext?(receive: (contexts: readonly string[] | null) => void): () => void
  removeContext?(index?: number): Promise<void>
  subscribeLocale?(receive: (locale: string | undefined) => void): () => void
  watch?(
    session: string,
    receive: () => void,
    report: (error: unknown) => void,
  ): Promise<() => Promise<void>>
  call(
    name: string,
    arguments_: Record<string, unknown>,
    options?: ViewerRequestOptions,
  ): Promise<CallToolResult>
  context(selection: ViewerContext): Promise<void>
  location?(location: ViewerFileLocation): Promise<void>
  start(
    receive: (session: ViewerConnection, navigation?: NavigationOptions) => void,
    report: (error: unknown) => void,
    refresh: () => void,
    onTeardown?: () => Promise<void>,
  ): Promise<() => void>
}

export interface ViewerRequestOptions {
  readonly signal?: AbortSignal
  readonly timeout?: number
}

export interface ViewerFileLocation {
  readonly path: string
  readonly workspace: string
}

export interface NavigationPoint {
  readonly x: number
  readonly y: number
}
export interface ReferenceChoices {
  readonly groups?: readonly NavigationGroup[]
  readonly kind?: 'definition' | 'references'
  readonly label: string
  readonly locations: readonly NavigationLocation[]
  readonly point: NavigationPoint
  readonly status?: 'resolving' | 'searching' | 'complete' | 'failed'
}
