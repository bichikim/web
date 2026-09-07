import {describe, expect, it} from 'vitest'

import dataset from '../dataset.json'
import hardExamples from '../hard-examples.json'
import sufficiencyDataset from '../sufficiency-dataset.json'
import {MODIFIER_LABELS, PRIMARY_LABELS} from '../training-data.mjs'

const includesModifier = (modifiers: readonly string[], modifier: string) =>
  modifiers.includes(modifier)

describe('text mood dataset', () => {
  it('should keep every primary mood balanced across isolated splits', () => {
    const ids = new Set(dataset.items.map((item) => item.id))

    expect(ids.size).toBe(dataset.items.length)
    expect(dataset.items).toHaveLength(240)

    for (const label of PRIMARY_LABELS) {
      const rows = dataset.items.filter((item) => item.primary === label)
      expect(rows.filter((item) => item.split === 'train')).toHaveLength(14)
      expect(rows.filter((item) => item.split === 'validation')).toHaveLength(3)
      expect(rows.filter((item) => item.split === 'test')).toHaveLength(3)
    }
  })

  it('should include independent train, validation, and test modifier examples', () => {
    for (const modifier of MODIFIER_LABELS) {
      const rows = dataset.items.filter((item) => item.modifiers.includes(modifier))
      const splits = new Set(rows.map((item) => item.split))

      expect(rows).toHaveLength(18)
      expect(splits).toEqual(new Set(['train', 'validation', 'test']))
    }
  })

  it('should keep hard examples isolated to training without duplicate ids or text', () => {
    const combinedItems = [...dataset.items, ...hardExamples.items]
    const ids = new Set(combinedItems.map((item) => item.id))
    const texts = new Set(combinedItems.map((item) => item.text))

    expect(hardExamples.schemaVersion).toBe(1)
    expect(hardExamples.items).toHaveLength(84)
    expect(hardExamples.items.every((item) => item.split === 'train')).toBe(true)
    expect(ids.size).toBe(combinedItems.length)
    expect(texts.size).toBe(combinedItems.length)

    for (const label of PRIMARY_LABELS) {
      expect(
        hardExamples.items.filter((item) => item.primary === label).length,
      ).toBeGreaterThanOrEqual(4)
    }

    for (const modifier of MODIFIER_LABELS) {
      const rows = hardExamples.items.filter((item) => includesModifier(item.modifiers, modifier))

      expect(rows).toHaveLength(18)
      expect(
        rows.every((item) => 'primaryTraining' in item && item.primaryTraining === false),
      ).toBe(true)
    }
  })

  it('should isolate sufficiency labels and preserve known false-positive regressions', () => {
    const ids = new Set(sufficiencyDataset.items.map((item) => item.id))
    const texts = new Set(sufficiencyDataset.items.map((item) => item.text))

    expect(ids.size).toBe(sufficiencyDataset.items.length)
    expect(texts.size).toBe(sufficiencyDataset.items.length)

    for (const split of ['train', 'validation', 'test']) {
      const rows = sufficiencyDataset.items.filter((item) => item.split === split)

      expect(rows.some((item) => item.sufficient)).toBe(true)
      expect(rows.some((item) => !item.sufficient)).toBe(true)
    }

    expect(
      sufficiencyDataset.items.find(
        (item) => item.text === '와, 정말 완벽하게 해냈네. 파일을 전부 지워 버리다니.',
      ),
    ).toMatchObject({split: 'validation', sufficient: true})
  })
})
