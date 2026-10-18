import type {Accessor} from 'solid-js'

export interface UseUndoHistoryProps<Value> {
  /** Maximum retained captures, read at creation. Must be a positive integer; defaults to 200. */
  readonly limit?: number
  /** Synchronously applies the snapshot. Wrap Solid setters when Value can be a function. */
  readonly onChange: (value: Value) => void
  readonly valueAccessor: Accessor<Value>
}

export interface UndoHistory {
  readonly canRedo: Accessor<boolean>
  readonly canUndo: Accessor<boolean>
  readonly capture: () => void
  readonly redo: () => void
  readonly reset: () => void
  readonly undo: () => void
}
