import type {GenerateSajuRequest, SajuWorkerResponse} from './messages'

type CompleteResponse = Extract<SajuWorkerResponse, {type: 'complete'}>
type GenerateText = (messages: GenerateSajuRequest['messages']) => Promise<string>

/** Returns the model's first answer without inspecting its content. */
export async function generateSajuAnswer(
  request: GenerateSajuRequest,
  generateText: GenerateText,
): Promise<CompleteResponse> {
  const text = await generateText(request.messages)
  return {text, type: 'complete'}
}
