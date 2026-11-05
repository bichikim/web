import {APIEvent} from '@solidjs/start/server'
import {fetchSupporters, filterWithMessage} from 'src/utils/supporters'
import {getBmcAccessToken} from 'src/env'

// 5 minutes
const CACHE_MAX_AGE = 300

export async function GET(_event: APIEvent) {
  const token = getBmcAccessToken()

  if (!token) {
    return new Response(JSON.stringify({messages: []}), {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  try {
    const response = await fetchSupporters(token, 1)
    const lastPage = response.last_page === undefined ? 1 : response.last_page

    if (
      !Number.isSafeInteger(lastPage) ||
      lastPage < 1 ||
      !Array.isArray(response.data ?? []) ||
      (response.current_page !== undefined && response.current_page !== 1)
    ) {
      throw new Error('Invalid BMC pagination metadata')
    }

    const pages = [response.data ?? []]

    for (let page = 2; page <= lastPage; page += 1) {
      // Validate each page before issuing another request; avoid an unbounded request fan-out.
      // oxlint-disable-next-line no-await-in-loop
      const next = await fetchSupporters(token, page)

      if (
        next.current_page !== page ||
        next.last_page !== lastPage ||
        !Array.isArray(next.data ?? [])
      ) {
        throw new Error('Inconsistent BMC pagination metadata')
      }

      pages.push(next.data ?? [])
    }

    const messages = filterWithMessage(pages.flat())

    return new Response(JSON.stringify({messages}), {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  } catch {
    return new Response(JSON.stringify({messages: []}), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }
}
