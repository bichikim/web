import type {HistorySourcePolicy} from './contract'

export const HISTORY_SOURCE_POLICY: HistorySourcePolicy = {
  allowedDomains: [
    'archives.gov',
    'britannica.com',
    'history.com',
    'iwm.org.uk',
    'loc.gov',
    'nasa.gov',
    'nationalarchives.gov.uk',
    'smithsonianmag.com',
    'un.org',
    'unesco.org',
  ],
  seedUrls: [
    'https://www.britannica.com/on-this-day',
    'https://www.history.com/this-day-in-history',
  ],
  version: 'history-sources-v1',
}
