import type {APIEvent} from '@solidjs/start/server'

import {createSitemapResponse} from 'src/features/search-discovery'

export const GET = (event: APIEvent): Response => createSitemapResponse(event.request)

export const HEAD = (event: APIEvent): Response => createSitemapResponse(event.request)
