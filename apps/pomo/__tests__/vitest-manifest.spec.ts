/** @vitest-environment node */
import {expect, it} from 'vitest'
import config from '../../../vitest.base.config.mts'

it('should define SolidStart client entry markers for manifest loading', () => {
  expect(config.define).toMatchObject({
    'import.meta.env.START_CLIENT_ENTRY': JSON.stringify('./src/entry-client.tsx'),
    'import.meta.env.START_CLIENT_ENTRY_URL': JSON.stringify('./src/entry-client.tsx'),
  })
})
