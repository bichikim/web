import type {PictureDiaryEntry} from '../../../features/picture-diary'

interface EntryPage {
  readonly kind: 'entry'
  readonly entry: PictureDiaryEntry
}
interface WritingPage {
  readonly kind: 'writing'
}
interface CoverPage {
  readonly kind: 'cover'
}
interface BlankPage {
  readonly kind: 'blank'
}
export type BookPage = EntryPage | WritingPage | CoverPage | BlankPage
export interface BookSpread {
  readonly left: BookPage
  readonly right: BookPage
}
interface PaginationOptions {
  readonly entries: ReadonlyArray<PictureDiaryEntry>
  readonly selectedId?: string
  readonly closed?: boolean
  readonly compact?: boolean
  readonly ending?: boolean
}
export interface BookPagination {
  readonly current: BookSpread
  readonly older: BookSpread | null
  readonly newer: BookSpread | null
}

export const getBookPagination = (options: PaginationOptions): BookPagination => {
  const pages: ReadonlyArray<BookPage> = [
    {kind: 'cover'},
    ...options.entries.toReversed().map((entry): BookPage => ({entry, kind: 'entry'})),
    {kind: 'writing'},
    ...(!options.compact && options.entries.length % 2 === 0
      ? ([{kind: 'blank'}, {kind: 'cover'}] as const)
      : ([{kind: 'cover'}] as const)),
  ]
  const found = pages.findIndex(
    (page) => page.kind === 'entry' && page.entry.id === options.selectedId,
  )
  const selected = options.closed
    ? 1
    : options.ending
      ? pages.length - 1
      : found < 0
        ? options.entries.length + 1
        : found
  const step = options.compact ? 1 : 2
  const first = options.compact ? 1 : 0
  const index = options.compact ? selected : Math.floor(selected / 2) * 2
  const spreadAt = (offset: number): BookSpread => ({
    left: options.compact ? {kind: 'cover'} : (pages[offset] ?? {kind: 'blank'}),
    right: pages[offset + (options.compact ? 0 : 1)] ?? {kind: 'cover'},
  })
  const current = spreadAt(index)
  return {
    current,
    newer: options.closed ? current : index + step < pages.length ? spreadAt(index + step) : null,
    older: !options.closed && index > first ? spreadAt(index - step) : null,
  }
}
