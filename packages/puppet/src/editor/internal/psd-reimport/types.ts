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
  readonly kind: 'keep' | 'conflict'
  readonly removablePartId?: string
}
export type PsdReimportRow = ReimportUpdate | ReimportAdd | ReimportKeep
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
