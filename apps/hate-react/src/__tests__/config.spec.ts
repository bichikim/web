import {describe, expect, it} from 'vitest'
import {BMC_URL} from '../config'

describe('BMC_URL', () => {
  it('should use the default campaign account when no override is configured', () => {
    expect(BMC_URL).toBe('https://buymeacoffee.com/ifuckinghatereact')
  })
})
