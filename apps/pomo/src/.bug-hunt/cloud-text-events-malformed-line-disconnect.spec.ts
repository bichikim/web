/** @vitest-environment node */
import {expect, it} from 'vitest'

import {readCloudTextEvents} from '../features/cloud-text/job-events'

it('should treat a malformed event line as a disconnected stream so the client can reconnect', async () => {
  const response = new Response('not-json\n')
  if (response.body === null) {
    throw new Error('Expected a response body.')
  }

  await expect(readCloudTextEvents(response.body, new AbortController().signal)).resolves.toEqual({
    cause: expect.any(SyntaxError),
    kind: 'disconnected',
  })
})
