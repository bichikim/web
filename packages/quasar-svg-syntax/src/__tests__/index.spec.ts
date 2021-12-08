import {generate} from '../'

describe('quasar-svg-syntax', () => {
  it('should return quasar svg string', async () => {
    const result = await generate(`
      <svg>
        <path d="M0 0 L10 10" />
      </svg>
    `)
    expect(result).toBe('M0 0 L10 10')
  })
  it('should return quasar svg string with viewBox', async () => {
    const result = await generate(`
      <svg viewBox="0 0 156 149">
        <path d="M0 0 L10 10" />
      </svg>
    `)
    expect(result).toBe('M0 0 L10 10|0 0 156 149')
  })
})
