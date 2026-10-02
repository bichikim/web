/** @vitest-environment node */
import {expect, it} from 'vitest'
import {handleRelaxRequest} from '../relax-routing'

it.each(['/', '/relax', '/relax/'])('should allow the player page at %s', (pathname) => {
  expect(handleRelaxRequest(new Request(`https://slowcove.example${pathname}`))).toBeNull()
})

it.each([
  '/api/cron/ai-jobs',
  '/api/account',
  '/admin',
  '/account',
  '/api/%63ron/auth-maintenance',
])('should reject unrelated backend and app paths at %s', (pathname) => {
  const response = handleRelaxRequest(new Request(`https://slowcove.example${pathname}`))
  expect(response?.status).toBe(404)
  expect(response?.headers.get('Cache-Control')).toBe('no-store')
})

it('should send the all-in-one escape route to the configured Pomo site', () => {
  const response = handleRelaxRequest(new Request('https://slowcove.example/?layout=all-in-one'))
  expect(response?.status).toBe(302)
  expect(response?.headers.get('Location')).toBe('https://www.pomofi.io/?layout=all-in-one')
})
