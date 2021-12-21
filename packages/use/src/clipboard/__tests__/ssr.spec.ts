/**
 * @jest-environment node
 */
import {useClipboard} from '../'

describe('clipboard in ssr', () => {
  it('should not copy', () => {
    const {value, state, write, read} = useClipboard()

    expect(state.value).toBe('idle')
    expect(value.value).toBe(undefined)
    write('foo')
    read()
    expect(state.value).toBe('idle')
    expect(value.value).toBe(undefined)
  })
})
