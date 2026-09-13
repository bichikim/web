export interface ReferenceTransform {
  readonly rename: (id: string) => string
  readonly keepPart: (id: string) => boolean
  readonly keepGlue: (id: string) => boolean
}
