import type {Accessor} from 'solid-js'

export interface UseOffsetListProps<Item, Key> {
  readonly getKey: (item: Item) => Key
}

export interface ReplaceOffsetPageOptions {
  readonly retainItems?: boolean
}

export interface OffsetList<Item, Key> {
  readonly items: Accessor<ReadonlyArray<Item>>
  readonly nextOffset: Accessor<number>
  readonly appendPage: (items: ReadonlyArray<Item>) => void
  readonly replacePage: (items: ReadonlyArray<Item>, options?: ReplaceOffsetPageOptions) => void
  readonly reset: () => void
  readonly updateItem: (key: Key, update: (item: Item) => Item) => void
}
