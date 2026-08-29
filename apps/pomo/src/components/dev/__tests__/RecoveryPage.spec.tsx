import {expect, it} from 'vitest'

import RecoveryPage from '../RecoveryPage'

it('should throw a preview error for the application recovery boundary', () => {
  expect(() => RecoveryPage()).toThrow('Pomofi development recovery preview')
})
