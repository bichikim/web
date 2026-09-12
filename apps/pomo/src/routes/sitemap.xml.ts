import type {APIEvent} from '@solidjs/start/server'

import {createSitemapResponse} from 'src/server/search-discovery/create-sitemap-response'

export const GET = (event: APIEvent): Response => createSitemapResponse(event.request)

export const HEAD = (event: APIEvent): Response => createSitemapResponse(event.request)
