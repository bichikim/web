export interface ConversationMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
}
export interface ChatInput {
  readonly type: 'chat'
  readonly messages: readonly ConversationMessage[]
}
export interface ChatGeneration {
  readonly generate: (input: ChatInput, onStatus?: (text: string) => void) => Promise<string>
}
export type InferenceInput = ChatInput
export interface InferenceRequest {
  readonly id: number
  readonly input: InferenceInput
  readonly runtimePath: string
  readonly modelPath: string
}
export interface InferenceReply {
  readonly id: number
  readonly type: 'text' | 'status' | 'error'
  readonly text: string
}
export interface LocalInference {
  readonly run: (
    input: InferenceInput,
    signal: AbortSignal,
    onStatus?: (text: string) => void,
  ) => Promise<string>
  readonly dispose: () => void
}
