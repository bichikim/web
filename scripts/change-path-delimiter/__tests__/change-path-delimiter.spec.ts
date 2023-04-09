import {changePathDelimiter} from '../'

describe('changePathDelimiter', () => {
  it('should change the path delimiter', () => {
    expect(changePathDelimiter('\\a\\b\\c\\', '\\')).toBe('/a/b/c/')
  })
})
