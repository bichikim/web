import {describe, expect, test} from 'vitest'

import modelSource from '../../../../examples/development-model.json?raw'
import {parseDocument} from '../../parse-document'
import {getPartRenderPlans} from '../render-plan'

const parsed = parseDocument(modelSource)
if (!parsed.ok) {
  throw new Error('Invalid development model')
}
const model = parsed.document
const leftArm = ['psd-27', 'psd-30', 'psd-31', 'psd-32', 'psd-33']
const rightArm = ['psd-28', 'psd-35', 'psd-36', 'psd-37', 'psd-38']
const skirt = ['psd-6', 'psd-7', 'psd-41', 'psd-42', 'psd-43']

describe('development model arm occlusion', () => {
  test.each(['body-x', 'full-body-x'])(
    'should switch every hand and sleeve across the entire skirt beyond either %s threshold',
    (parameterId) => {
      const baseline = getPartRenderPlans(model).map((plan) => plan.partId)
      const limit = parameterId === 'full-body-x' ? 22 : 30
      for (const value of [0, 15, -15, 15.1, -15.1, limit, -limit, 0]) {
        const order = getPartRenderPlans(model, {[parameterId]: value}).map((plan) => plan.partId)
        if (Math.abs(value) <= 15) {
          expect(order).toEqual(baseline)
          for (const armId of [...leftArm, ...rightArm]) {
            for (const skirtId of skirt) {
              expect(
                order.indexOf(armId),
                `${parameterId}=${value}: ${armId} ahead of ${skirtId}`,
              ).toBeGreaterThan(order.indexOf(skirtId))
            }
          }
        } else {
          const front = value > 0 ? leftArm : rightArm
          const back = value > 0 ? rightArm : leftArm
          for (const skirtId of skirt) {
            for (const armId of front) {
              expect(
                order.indexOf(armId),
                `${parameterId}=${value}: ${armId} ahead of ${skirtId}`,
              ).toBeGreaterThan(order.indexOf(skirtId))
            }
            for (const armId of back) {
              expect(
                order.indexOf(armId),
                `${parameterId}=${value}: ${armId} behind ${skirtId}`,
              ).toBeLessThan(order.indexOf(skirtId))
            }
          }
          expect(order.filter((id) => front.includes(id))).toEqual(front)
          expect(order.filter((id) => back.includes(id))).toEqual(back)
        }
      }
    },
  )
})
