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
    const data = response.data ?? []
    const messages = filterWithMessage(data as unknown[])

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
