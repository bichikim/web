import {expect, it} from 'vitest'
import {semanticBindingsSchema, semanticFrameSchema} from '../semantics'

it('should retain a state preview and reject unknown or simultaneous manual previews', () => {
  const frame = {agentPreview: 'working', scores: {}, widgetId: 'widget'}
  expect(semanticFrameSchema.parse(frame)).toEqual(frame)
  expect(semanticFrameSchema.safeParse({...frame, agentPreview: 'missing'}).success).toBe(false)
  expect(semanticFrameSchema.safeParse({...frame, previewId: 'happy'}).success).toBe(false)
})

const binding = {
  enabled: true,
  id: 'happy',
  mode: 'toggle',
  parameterId: null,
  text: 'Legacy text',
  threshold: 0.8,
}
it('should reject duplicate languages, invalid tags and too many languages', () => {
  const example = {language: 'en', text: 'Happy'}
  expect(
    semanticBindingsSchema.safeParse([{...binding, examples: [example, example]}]).success,
  ).toBe(false)
  expect(
    semanticBindingsSchema.safeParse([
      {...binding, examples: [{...example, language: 'not a language'}]},
    ]).success,
  ).toBe(false)
  expect(
    semanticBindingsSchema.safeParse([
      {
        ...binding,
        examples: Array.from({length: 17}, (_, index) => ({...example, language: `en-x-${index}`})),
      },
    ]).success,
  ).toBe(false)
})
