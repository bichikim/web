import {expect, it} from 'vitest'

import {usePEventController} from '../use-p-event-controller'
// oxlint-disable-next-line import/default -- Vite exposes raw imports as default strings.
import source from '../use-p-event-controller.ts?raw'

it('should load with the development localization output', () => {
  expect(usePEventController).toBeTypeOf('function')
})

it('should import messages from the output-structure-independent entrypoint', () => {
  expect(source).toContain("from '@paraglide/message'")
  expect(source).not.toMatch(/from '@paraglide\/message\//u)
})
