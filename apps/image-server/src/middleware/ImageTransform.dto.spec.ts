import 'reflect-metadata'
import {plainToInstance} from 'class-transformer'
import {validate} from 'class-validator'
import {describe, expect, it} from 'vitest'
import {ImageTransform} from './ImageTransform.dto'

const parse = async (values: Record<string, unknown>) => {
  const result = plainToInstance(ImageTransform, values)

  return {errors: await validate(result), result}
}

describe('ImageTransform', () => {
  it('converts numeric query parameters and accepts a named position', async () => {
    const {errors, result} = await parse({
      format: 'webp',
      position: 'center',
      quality: '75',
      width: '320',
    })

    expect(errors).toHaveLength(0)
    expect(result).toMatchObject({quality: 75, width: 320})
  })

  it.each([
    {format: 'webp', quality: '101', width: '320'},
    {format: 'webp', position: 'somewhere', width: '320'},
    {format: 'webp', width: '-1'},
  ])('rejects invalid transform parameters', async (values) => {
    const {errors} = await parse(values)

    expect(errors.length).toBeGreaterThan(0)
  })
})
