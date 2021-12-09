import {readArgv} from '../read-argv'

describe('read-argv', () => {
  it('should read argv', () => {
    const result = readArgv(['/bin.js', '/src/index.ts', '--foo', 'bar', '--baz', 'qux', '/directory'])
    expect(result.directory).toBe('/directory')
  })
})
