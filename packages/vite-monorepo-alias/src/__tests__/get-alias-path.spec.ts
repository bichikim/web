import {getAliasPath} from '../get-alias-path'

const workspacePath = '^/Users/app/packages/[-/._a-zA-Z0-9]*/'

describe('getAliasPath', () => {
  it('should return alias with string', () => {
    expect(getAliasPath(workspacePath, 'src'))
  })
})
