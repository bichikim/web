export interface SemanticRequest {
  readonly id: number
  readonly texts: readonly string[]
  readonly modelPath: string
  readonly runtimePath: string
}
export type SemanticReply =
  | {
      readonly id: number
      readonly type: 'vectors'
      readonly vectors: readonly (readonly number[])[]
    }
  | {readonly id: number; readonly type: 'error'; readonly message: string}
