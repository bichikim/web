import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {
  CodeLocation,
  NavigationLocation,
  ViewerConnection,
  WorkspaceEntry,
} from '../shared/contracts'

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
  historyIndex?: number
  preserveSelection?: boolean
  restoreView?: boolean
}

export interface ViewerPort {
  watch?(session: string, receive: () => void): Promise<() => Promise<void>>
  call(name: string, arguments_: Record<string, unknown>): Promise<CallToolResult>
  context(selection: ViewerContext): Promise<void>
  location?(location: ViewerFileLocation): Promise<void>
  start(
    receive: (session: ViewerConnection) => void,
    report: (error: unknown) => void,
    refresh: () => void,
    onTeardown?: () => Promise<void>,
  ): Promise<() => void>
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
  readonly label: string
  readonly locations: readonly NavigationLocation[]
  readonly point: NavigationPoint
}
