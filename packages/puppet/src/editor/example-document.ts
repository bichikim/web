export interface PuppetExampleDocument {
  readonly label: string
  readonly load: (signal: AbortSignal) => Promise<File>
}
