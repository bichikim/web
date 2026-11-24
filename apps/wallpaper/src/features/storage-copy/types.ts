export interface StorageDatabase {
  readonly name: string
  readonly length: number
  readonly sha256: string
}
export interface StorageManifest {
  readonly databases: ReadonlyArray<StorageDatabase>
  readonly localStorage: Readonly<Record<string, string>>
}
export interface ExportArchiveRequest {
  readonly id: number
  readonly kind: 'export'
  readonly name: string
}
export interface ImportArchiveRequest {
  readonly id: number
  readonly kind: 'import'
  readonly blob: Blob
  readonly expected: StorageDatabase
}
export type ArchiveRequest = ExportArchiveRequest | ImportArchiveRequest
export interface ExportedArchive {
  readonly id: number
  readonly kind: 'exported'
  readonly blob: Blob
  readonly database: StorageDatabase
}
export interface ImportedArchive {
  readonly id: number
  readonly kind: 'imported'
}
export interface FailedArchive {
  readonly id: number
  readonly kind: 'error'
  readonly message: string
}
export type ArchiveResponse = ExportedArchive | ImportedArchive | FailedArchive
