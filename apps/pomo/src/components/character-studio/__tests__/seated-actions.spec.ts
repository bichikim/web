import {expect, it} from 'vitest'
import {sampleSeatedAction} from '../seated-actions'

it('should alternate resting, glancing, gesturing and adjusting without snapping', () => {
  expect(sampleSeatedAction(0).gesture).toBe(0)
  expect(sampleSeatedAction(15).gesture).toBeGreaterThan(0.9)
  expect(sampleSeatedAction(25).hands).toBeGreaterThan(0.9)
  expect(sampleSeatedAction(36).shift).toBeGreaterThan(0.9)
  expect(sampleSeatedAction(12).gesture).toBeCloseTo(sampleSeatedAction(11.999).gesture)
  expect(sampleSeatedAction(48)).toEqual(sampleSeatedAction(0))
})
