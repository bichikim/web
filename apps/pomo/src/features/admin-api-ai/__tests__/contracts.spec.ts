import {expect, it} from 'vitest'
import {apiAiCatalogSchema, apiAiRouteListSchema} from '../contracts'

const schemas = [
  {
    message: 'The same provider and model cannot appear twice',
    name: 'routes',
    schema: apiAiRouteListSchema,
  },
  {
    message: 'The same provider model cannot be registered twice',
    name: 'catalog',
    schema: apiAiCatalogSchema,
  },
] as const

it.each(schemas)('should accept distinct provider/model pairs in $name', ({schema}) => {
  const result = schema.safeParse([
    {model: 'Model', providerId: 'first'},
    {model: 'model', providerId: 'first'},
    {model: 'Model', providerId: 'second'},
  ])
  expect(result.success).toBe(true)
})

it.each(schemas)(
  'should reject duplicate normalized pairs with the original $name issue',
  ({message, schema}) => {
    const result = schema.safeParse([
      {model: ' Model ', providerId: 'first'},
      {model: 'Model', providerId: 'first'},
    ])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toEqual([{code: 'custom', message, path: []}])
    }
  },
)

it.each(schemas)('should retain input getter reads while normalizing $name', ({schema}) => {
  const reads: string[] = []
  const result = schema.parse([
    {
      get model() {
        reads.push('model')
        return ' Model '
      },
      get providerId() {
        reads.push('providerId')
        return 'first'
      },
    },
  ])
  expect(reads).toEqual(['model', 'providerId'])
  expect(result[0]).toMatchObject({model: 'Model', providerId: 'first'})
})
