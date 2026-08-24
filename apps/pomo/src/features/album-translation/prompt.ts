import type {TextGenerationMessage} from '../text-generation/runtime'

export interface AlbumTranslationPromptOptions {
  readonly description: string
  readonly title: string
}

const SYSTEM_PROMPT = `You translate Korean music album metadata into English, Japanese, and Simplified Chinese.
Preserve the mood, meaning, punctuation, artist names, and intentional capitalization.
Album titles may be proper names. Transliterate or preserve them when a literal translation would sound unnatural.
Return valid JSON only. Do not use Markdown or add commentary.
Use exactly this shape:
{"en":{"title":"","description":""},"ja":{"title":"","description":""},"zh-Hans":{"title":"","description":""}}`

export const createAlbumTranslationMessages = (
  options: AlbumTranslationPromptOptions,
): Array<TextGenerationMessage> => [
  {content: SYSTEM_PROMPT, role: 'system'},
  {
    content: JSON.stringify({description: options.description.trim(), title: options.title.trim()}),
    role: 'user',
  },
]
