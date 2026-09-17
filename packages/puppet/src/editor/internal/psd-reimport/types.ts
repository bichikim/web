import type {PuppetDocument, PuppetPart} from '../../../player/document'
interface ReimportRowBase {
  readonly id: string
  readonly name: string
  readonly detail: string
}
interface ReimportUpdate extends ReimportRowBase {
  readonly kind: 'update'
  readonly part: PuppetPart
  readonly incomingId: string
}
interface ReimportAdd extends ReimportRowBase {
  readonly kind: 'add'
  readonly part: PuppetPart
}
interface ReimportKeep extends ReimportRowBase {
  readonly kind: 'keep'
  readonly removablePartId?: string
}
interface ReimportConflict extends ReimportRowBase {
  readonly kind: 'conflict'
}
export type PsdReimportRow = ReimportUpdate | ReimportAdd | ReimportKeep | ReimportConflict

export interface PsdReimportSelectionRow {
  readonly detail: string
  readonly id: string
  readonly label: string
  readonly name: string
}

export interface PsdReimportSelectionView {
  readonly count: number
  readonly hasAdditions: boolean
  readonly hasMissing: boolean
  readonly hasRetained: boolean
  readonly rows: ReadonlyArray<PsdReimportSelectionRow>
}

export interface PsdReimportOperations {
  readonly removedPartIds: ReadonlySet<string>
  readonly rows: ReadonlyArray<PsdReimportRow>
}

export interface PsdReimportSelection {
  readonly operations: PsdReimportOperations
  readonly view: PsdReimportSelectionView
}

export interface PsdReimportPlan {
  readonly document: PuppetDocument
  readonly sources: ReadonlyArray<PsdSourceOption>
  readonly sourceId?: string
  readonly incoming: PuppetDocument
  readonly rows: ReadonlyArray<PsdReimportRow>
  readonly mapping: ReadonlyMap<string, string>
  readonly viewportChanged: boolean
}

export interface PsdSourceOption {
  readonly id: string
  readonly name: string
  readonly fileName?: string
  readonly parts: ReadonlyArray<PuppetPart>
}
