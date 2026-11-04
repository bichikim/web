import type {PuppetExampleDocument} from '@winter-love/puppet/editor'

export interface EditorToolbarMenuProps {
  readonly onRecoveryOpen?: (returnFocus: () => void) => void
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  readonly canUndo?: boolean
  readonly canRedo?: boolean
  readonly historyUndoCount?: number
  readonly historyRedoCount?: number
  readonly onUndo?: () => void
  readonly onRedo?: () => void
  readonly onExport: () => void
  readonly onPoffoExport?: () => void
  readonly onAtlasExport?: () => void
  readonly onExampleOpen?: (example: PuppetExampleDocument) => void
  readonly onFileImport: (file: File | undefined) => void
  readonly onPsdReimport?: (file: File | undefined) => void
  readonly onFileOpen: (file: File | undefined) => void
}
