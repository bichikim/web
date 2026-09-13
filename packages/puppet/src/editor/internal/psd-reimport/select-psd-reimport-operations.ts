import type {PsdReimportRow} from './types'

interface ReimportSelectionOptions {
  readonly rows: ReadonlyArray<PsdReimportRow>
  readonly includeNew: boolean
  readonly removeMissing: boolean
}
const LABELS = {add: '추가', conflict: '확인 필요', keep: '유지', update: '갱신'} as const

export const selectPsdReimportOperations = (options: ReimportSelectionOptions) => {
  const isSelected = (row: PsdReimportRow): boolean => {
    switch (row.kind) {
      case 'update':
        return true
      case 'add':
        return options.includeNew
      case 'keep':
        return row.removablePartId !== undefined && options.removeMissing
      case 'conflict':
        return false
      default: {
        const exhaustive: never = row
        return exhaustive
      }
    }
  }
  const selectedRows = options.rows.filter(isSelected)
  const removedIds = new Set(
    selectedRows.flatMap((row) =>
      row.kind === 'keep' && row.removablePartId !== undefined ? [row.removablePartId] : [],
    ),
  )
  return {
    removedIds,
    selectedRows,
    count: selectedRows.length,
    hasAdditions: options.rows.some((row) => row.kind === 'add'),
    hasMissing: options.rows.some(
      (row) => row.kind === 'keep' && row.removablePartId !== undefined,
    ),
    hasRetained: options.rows.some((row) => row.kind === 'keep' || row.kind === 'conflict'),
    rows: options.rows.map((row) => ({
      id: row.id,
      label: row.kind === 'keep' && isSelected(row) ? '삭제' : LABELS[row.kind],
      name: row.name,
      detail:
        row.kind === 'keep' && isSelected(row)
          ? '레이어와 관련 연결 삭제 · 실행 취소 가능'
          : row.detail,
    })),
  }
}
