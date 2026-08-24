import {expect, it} from 'vitest'

it('should import domain validators without eagerly requiring optional environments', async () => {
  await expect(
    Promise.all([
      import('../../ai/environment'),
      import('../../auth/environment'),
      import('../../cron/environment'),
      import('../../database/environment'),
      import('../../feed-publisher/public-feed-registry'),
      import('../../toss-auth/environment'),
      import('../../weather/environment'),
    ]),
  ).resolves.toHaveLength(7)
})
