import {describe, expect, test} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'
import {getPartRenderPlans} from '../render-plan'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document

describe('development model arm occlusion', () => {
  const baseline = getPartRenderPlans(model).map((plan) => plan.partId)
  const leftArm = ['psd-27', 'psd-30', 'psd-31', 'psd-33']
  const rightArm = ['psd-28', 'psd-35', 'psd-36', 'psd-38']

  const expectOrder = (parameters: Readonly<Record<string, number>>) => {
    const rotation = (parameters['body-x'] ?? 0) + (parameters['full-body-x'] ?? 0)
    const targets = rotation > 15 ? rightArm : rotation < -15 ? leftArm : []
    const order = getPartRenderPlans(model, parameters).map((plan) => plan.partId)
    const unchanged = baseline.filter((id) => !targets.includes(id))
    expect(
      order.filter((id) => !targets.includes(id)),
      JSON.stringify(parameters),
    ).toEqual(unchanged)
    expect(order.filter((id) => targets.includes(id))).toEqual(
      baseline.filter((id) => targets.includes(id)),
    )
    for (const id of targets) {
      expect(baseline.indexOf(id)).toBeGreaterThan(baseline.indexOf('psd-6'))
      expect(order.indexOf(id)).toBeLessThan(order.indexOf('psd-6'))
    }
  }

  test.each(['body-x', 'full-body-x'])(
    'should switch the far arm while retaining shoulder layers across the %s range',
    (parameterId) => {
      const limit = parameterId === 'full-body-x' ? 22 : 30
      for (const value of [0, 15, 15.1, limit, -15, -15.1, -limit, 0]) {
        expectOrder({[parameterId]: value})
      }
    },
  )

  test('should combine body and full-body rotations without switching the upper frills', () => {
    const values = [
      {'body-x': 10, 'full-body-x': 5},
      {'body-x': 10, 'full-body-x': 5.1},
      {'body-x': -10, 'full-body-x': -5},
      {'body-x': -10, 'full-body-x': -5.1},
      {'body-x': 30, 'full-body-x': 22},
      {'body-x': -30, 'full-body-x': -22},
      {'body-x': 30, 'full-body-x': -22},
      {'body-x': -30, 'full-body-x': 22},
    ]
    for (const parameters of values) {
      expectOrder(parameters)
    }
  })
})
