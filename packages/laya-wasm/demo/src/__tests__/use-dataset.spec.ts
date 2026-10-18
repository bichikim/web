import {expect, it} from 'vitest'
import {useDataset} from '../use-dataset'

it('should append batches in order without losing targets or reusing deleted IDs', () => {
  const dataset = useDataset()
  const question = {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'} as const
  dataset.append([{question, state: 'first', target: [0, 1]}])
  dataset.remove(1)
  dataset.append([
    {question, state: 'second', target: [0.25, 0.75]},
    {question, state: 'third', target: [1, 0]},
  ])
  expect(dataset.entries().map((entry) => [entry.id, entry.label, entry.example.target])).toEqual([
    [2, 'b', [0.25, 0.75]],
    [3, 'a', [1, 0]],
  ])
})
