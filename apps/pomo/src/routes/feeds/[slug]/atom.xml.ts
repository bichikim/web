import type {APIEvent} from '@solidjs/start/server'

import {handlePublicFeed} from '../../../server/feed-publisher/handle-public-feed'

export const GET = (event: APIEvent): Promise<Response> => handlePublicFeed(event, 'atom')

export const HEAD = (event: APIEvent): Promise<Response> => handlePublicFeed(event, 'atom')
