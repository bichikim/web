import {expect, test} from 'vitest'
import {getStoryNarration} from '../get-story-narration'
import chapters from '../../../data/story/chapters.json'
import presets from '../../../data/speech-presets.json'
import {prepareSpeechLine} from '../../character-speech/configuration'

test.each(chapters.map((chapter, index) => ({chapter, index})))(
  'should use prebuilt speech for chapter $index',
  ({chapter, index}) => {
    const text = getStoryNarration(index)
    expect(text).toBe(chapter.description)
    const preset = presets.find((entry) => entry.id === chapter.speechId)
    expect(preset).toBeDefined()
    expect(prepareSpeechLine(preset!.text)).toBe(prepareSpeechLine(text!))
  },
)

test('should reject a chapter outside the introduction', () => {
  expect(getStoryNarration(-1)).toBeNull()
  expect(getStoryNarration(chapters.length)).toBeNull()
})
