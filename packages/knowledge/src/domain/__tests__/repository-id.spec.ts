import {describe, expect, it} from 'vitest'

import {parseRepositoryId} from '../repository-id'

describe('parseRepositoryId', () => {
  it.each([
    ['git@github.com:bichikim/web.git', 'github.com/bichikim/web'],
    ['https://github.com/bichikim/web.git', 'github.com/bichikim/web'],
    ['ssh://git@github.com/bichikim/web.git', 'github.com/bichikim/web'],
    ['https://GitHub.com/bichikim/web/', 'github.com/bichikim/web'],
    ['ssh://git@git.example.com:2222/team/web.git', 'git.example.com:2222/team/web'],
  ])('should normalize the Git remote %s', (remote, expectedRepositoryId) => {
    expect(parseRepositoryId(remote)).toEqual({
      ok: true,
      value: expectedRepositoryId,
    })
  })

  it.each(['', '../web', '/Users/example/web', 'file:///Users/example/web', 'https://%'])(
    'should reject the unsupported remote %s',
    (remote) => {
      expect(parseRepositoryId(remote)).toEqual({
        error: {
          code: 'unsupported-remote',
          remote,
        },
        ok: false,
      })
    },
  )
})
