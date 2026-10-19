import {createSignal} from 'solid-js'
import {renderOptions} from '../../src/sequence'
import type {TrainingExample} from '../../src/types'
import type {DatasetEntry} from './types'

export const useDataset = () => {
  const [entries, setEntries] = createSignal<readonly DatasetEntry[]>([])
  let nextId = 0
  const append = (examples: readonly TrainingExample[]): void => {
    const additions = examples.map((example) => {
      const labels = renderOptions(example.question)
      const strongest = example.target.reduce(
        (best, value, index) => (value > example.target[best] ? index : best),
        0,
      )
      nextId += 1
      return {example, id: nextId, label: labels[strongest]}
    })
    setEntries((current) => [...current, ...additions])
  }
  const remove = (id: number): void => {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }
  return {append, entries, remove}
}
