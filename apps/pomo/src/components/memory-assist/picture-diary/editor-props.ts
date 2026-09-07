import {
  type PictureDiaryEntry,
  type PictureDiaryImage,
  type PictureDiaryStroke,
} from '../../../features/picture-diary'
import type {BookSpread} from './pagination'
import type {PageTurnEnvironment} from './turn-environment'
import type {EntryEditingController} from './use-entry-editing'

export interface PictureDiaryEditorProps {
  readonly editing?: ReturnType<EntryEditingController['editor']>
  readonly disabled?: boolean
  readonly editingMessage?: string
  readonly onCancelEdit?: () => void
  readonly image?: PictureDiaryImage
  readonly onImageChange?: (image: PictureDiaryImage | undefined) => void
  readonly turnEnvironment?: PageTurnEnvironment
  readonly frontCoverClosed?: boolean
  readonly onFrontCoverChange?: (closed: boolean) => void
  readonly backCoverClosed?: boolean
  readonly canCloseBackCover?: boolean
  readonly canGoNewer?: boolean
  readonly canGoOlder?: boolean
  readonly spread: BookSpread
  readonly olderSpread?: BookSpread | null
  readonly newerSpread?: BookSpread | null
  readonly canSave: boolean
  readonly date: string
  readonly onCloseBackCover?: () => void
  readonly onDateChange: (date: string) => void
  readonly onEditEntry?: (entry: PictureDiaryEntry) => void
  readonly onDeleteEntry?: (id: string) => void
  readonly onGoNewer?: () => void
  readonly onGoOlder?: () => void
  readonly onOpenBackCover?: () => void
  readonly onSave: () => void
  readonly onStrokesChange: (strokes: ReadonlyArray<PictureDiaryStroke>) => void
  readonly onTextChange: (text: string) => void
  readonly strokes: ReadonlyArray<PictureDiaryStroke>
  readonly text: string
}

export type PageSide = 'current' | 'previous'
