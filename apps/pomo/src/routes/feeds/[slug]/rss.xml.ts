import type {APIEvent} from '@solidjs/start/server'

import {handlePublicFeed} from 'src/server/feed-publisher/handle-public-feed'

export const GET = (event: APIEvent): Promise<Response> => handlePublicFeed(event, 'rss')

export const HEAD = (event: APIEvent): Promise<Response> => handlePublicFeed(event, 'rss')
