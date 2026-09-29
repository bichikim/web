import {expect, it, vi} from 'vitest'

import {createAppsInTossLocalePreparation} from '..'

it('should activate the locale before updating the document', async () => {
  const steps: string[] = []
  const prepare = createAppsInTossLocalePreparation({
    activateLocale: async () => {
      steps.push('activate')
    },
    readLocale: async () => {
      steps.push('read')
      return 'en'
    },
    reportError: vi.fn(),
    updateDocumentLocale: () => {
      steps.push('document')
    },
  })

  expect(await prepare(() => true)).toEqual({status: 'prepared'})

  expect(steps).toEqual(['read', 'activate', 'document'])
})

it('should stop before activation when the caller becomes inactive', async () => {
  let resolveLocale: ((locale: 'en') => void) | undefined
  const activateLocale = vi.fn()
  const prepare = createAppsInTossLocalePreparation({
    activateLocale,
    readLocale: () =>
      new Promise<'en'>((resolve) => {
        resolveLocale = resolve
      }),
    reportError: vi.fn(),
    updateDocumentLocale: vi.fn(),
  })
  let isActive = true

  const completion = prepare(() => isActive)
  isActive = false
  resolveLocale?.('en')
  expect(await completion).toEqual({status: 'cancelled'})

  expect(activateLocale).not.toHaveBeenCalled()
})

it('should stop before updating the document when activation finishes after disposal', async () => {
  let resolveActivation: (() => void) | undefined
  const updateDocumentLocale = vi.fn()
  const prepare = createAppsInTossLocalePreparation({
    activateLocale: () =>
      new Promise<void>((resolve) => {
        resolveActivation = resolve
      }),
    readLocale: async () => 'en',
    reportError: vi.fn(),
    updateDocumentLocale,
  })
  let isActive = true

  const completion = prepare(() => isActive)
  await Promise.resolve()
  isActive = false
  resolveActivation?.()
  expect(await completion).toEqual({status: 'cancelled'})

  expect(updateDocumentLocale).not.toHaveBeenCalled()
})

it('should report preparation failures and return a failed result', () => {
  const error = new Error('locale unavailable')
  const reportError = vi.fn()
  const prepare = createAppsInTossLocalePreparation({
    activateLocale: vi.fn(),
    readLocale: () => Promise.reject(error),
    reportError,
    updateDocumentLocale: vi.fn(),
  })

  return expect(prepare(() => true))
    .resolves.toEqual({status: 'failed'})
    .then(() => {
      expect(reportError).toHaveBeenCalledWith(error)
    })
})
