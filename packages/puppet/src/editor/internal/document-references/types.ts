export interface ReferenceTransform {
  readonly rename: (id: string) => string
  readonly keepPart: (id: string) => boolean
  readonly keepNode?: (id: string) => boolean
  readonly keepParameter?: (id: string) => boolean
  readonly keepGlue: (id: string) => boolean
}
