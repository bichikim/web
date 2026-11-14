import type {GenerateSajuRequest, SajuWorkerResponse} from './messages'
import {formatSajuAnswer} from './format-answer'

type CompleteResponse = Extract<SajuWorkerResponse, {type: 'complete'}>
type GenerateText = (messages: GenerateSajuRequest['messages']) => Promise<string>

/** Generates one consultation and removes reference-only introductory wording. */
export async function generateSajuAnswer(
  request: GenerateSajuRequest,
  generateText: GenerateText,
): Promise<CompleteResponse> {
  const text = await generateText(request.messages)
  return {text: formatSajuAnswer(text), type: 'complete'}
}
