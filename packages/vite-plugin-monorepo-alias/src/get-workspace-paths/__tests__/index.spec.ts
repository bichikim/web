import {getWorkspacePath} from '../'

describe('getWorkspacePath', () => {
  it.each([
    //
    [
      ['/packages', '/apps'],
      ['^/packages/[-._a-zA-Z0-9]*/', '^/apps/[-._a-zA-Z0-9]*/'],
    ],
    [
      [/^\/apps\//u, /^\/packages\//u],
      [String.raw`^\/apps/[-._a-zA-Z0-9]*/`, String.raw`^\/packages/[-._a-zA-Z0-9]*/`],
    ],
  ])('should return workspace path string regexp', (workspacePaths, result) => {
    expect(getWorkspacePath(workspacePaths)).toEqual(result)
  })
})
