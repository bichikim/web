import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js'
import type {CodeLocation, ViewerSession} from '../shared/contracts'

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

export interface Notice {
  message: string
}

export interface WorkspaceSelection {
  readonly kind: 'file' | 'directory'
  readonly path: string
}

export type ViewerContext = CodeSelection | WorkspaceSelection

export interface ContextMenuItem {
  readonly label: string
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
  call(name: string, arguments_: Record<string, unknown>): Promise<CallToolResult>
  context(selection: ViewerContext): Promise<void>
  location?(location: ViewerFileLocation): Promise<void>
  start(
    receive: (session: ViewerSession) => void,
    report: (error: unknown) => void,
    refresh: () => void,
  ): Promise<() => void>
}

export interface ViewerFileLocation {
  readonly path: string
  readonly workspace: string
}
