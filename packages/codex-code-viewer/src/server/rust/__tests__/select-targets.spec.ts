import {describe, expect, it} from 'vitest'
import {selectTargets} from '../select-targets'

describe('selectTargets', () => {
  it('should choose the first available configured source and use its canonical path', () => {
    expect(
      selectTargets({
        automatic: undefined,
        binaries: [],
        configured: [{kind: 'binary', name: 'tool', paths: ['missing', 'alias', 'last']}],
        files: new Map([
          ['alias', '/canonical/tool.rs'],
          ['last', '/canonical/last.rs'],
        ]),
      }),
    ).toEqual([{kind: 'binary', name: 'tool', path: '/canonical/tool.rs'}])
  })
  it('should suppress an automatic binary overridden by a configured binary of the same name', () => {
    expect(
      selectTargets({
        automatic: {kind: 'binary', name: 'app', paths: ['inferred']},
        binaries: [],
        configured: [{kind: 'binary', name: 'app', paths: ['configured']}],
        files: new Map([
          ['configured', '/code/main.rs'],
          ['inferred', '/src/main.rs'],
        ]),
      }),
    ).toEqual([{kind: 'binary', name: 'app', path: '/code/main.rs'}])
  })
  it('should omit unavailable sources and deduplicate roots after canonicalization', () => {
    expect(
      selectTargets({
        automatic: undefined,
        binaries: [],
        configured: [
          {kind: 'lib', name: 'app', paths: ['library']},
          {kind: 'binary', name: 'alias', paths: ['alias']},
          {kind: 'binary', name: 'missing', paths: ['missing']},
        ],
        files: new Map([
          ['library', '/src/lib.rs'],
          ['alias', '/src/lib.rs'],
        ]),
      }),
    ).toEqual([{kind: 'lib', name: 'app', path: '/src/lib.rs'}])
  })
  it('should infer binary names from file and directory roots', () => {
    expect(
      selectTargets({
        automatic: {kind: 'binary', name: 'app', paths: ['main']},
        binaries: ['src/bin/my-tool.rs', 'src/bin/other/main.rs'],
        configured: [],
        files: new Map([
          ['src/bin/my-tool.rs', '/one.rs'],
          ['src/bin/other/main.rs', '/two.rs'],
        ]),
      }),
    ).toEqual([
      {kind: 'binary', name: 'my_tool', path: '/one.rs'},
      {kind: 'binary', name: 'other', path: '/two.rs'},
    ])
  })
})
