/**
 * @jest-environment jsdom
 */
import * as composition from '../'

describe('composition', () => {
  it('should have all functions', () => {
    expect(Object.keys(composition)).toMatchSnapshot()
  })
})
