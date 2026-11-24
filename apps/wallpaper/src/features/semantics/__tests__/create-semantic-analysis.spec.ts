import {expect, it, vi} from 'vitest'
import {createSemanticAnalysis} from '../create-semantic-analysis'

const binding = {
  action: {id: 'smile', kind: 'expression' as const},
  enabled: true,
  id: 'happy',
  mode: 'toggle' as const,
  parameterId: null,
  text: 'happy',
  threshold: 0.8,
}
it('should reuse completed segment scores and invalidate them when examples change', async () => {
  const embed = vi.fn(async (texts: readonly string[]) => texts.map(() => [1, 0]))
  const analysis = createSemanticAnalysis(embed)
  const scores = await analysis({bindings: [binding], text: 'First segment.'})
  expect(await analysis({bindings: [binding], text: 'First segment.'})).toEqual(scores)
  expect(embed).toHaveBeenCalledOnce()
  await analysis({bindings: [{...binding, text: 'joyful'}], text: 'First segment.'})
  expect(embed).toHaveBeenCalledTimes(2)
})

it('should retry failed analysis without caching the failure', async () => {
  const embed = vi
    .fn()
    .mockRejectedValueOnce(Error('model unavailable'))
    .mockResolvedValue([
      [1, 0],
      [1, 0],
    ])
  const analysis = createSemanticAnalysis(embed)
  await expect(analysis({bindings: [binding], text: 'First segment.'})).rejects.toThrow(
    'model unavailable',
  )
  expect(await analysis({bindings: [binding], text: 'First segment.'})).toEqual({happy: 1})
})
