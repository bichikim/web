import {paraglideMiddleware} from '@paraglide/server'
import type {Middleware} from 'h3'
import {corsMiddleware} from './cors'
import {securityHeadersMiddleware} from './security-headers'

export const DOCUMENT_MIDDLEWARE: Middleware[] = [
  securityHeadersMiddleware,
  corsMiddleware,
  (event, next) => paraglideMiddleware(event.req, () => next()),
]
