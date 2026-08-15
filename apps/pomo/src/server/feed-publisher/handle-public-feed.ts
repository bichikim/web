import type {APIEvent} from '@solidjs/start/server'

import {createFeedResponse, type FeedFormat} from 'src/features/feed-publisher'
import {createPublicFeedRegistry} from './public-feed-registry'

/** Handles a public feed route without reading session or user state. */
export const handlePublicFeed = (event: APIEvent, format: FeedFormat): Promise<Response> =>
  createFeedResponse({
    format,
    registry: createPublicFeedRegistry(event.request),
    request: event.request,
    slug: event.params.slug,
  })
