import {expect, it} from 'vitest'

import {checkServerHealth} from '../health'

it('should return a successful server-function health response', async () => {
  await expect(checkServerHealth()).resolves.toEqual({status: 'ok'})
})
