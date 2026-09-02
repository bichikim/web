import {query} from '@solidjs/router'

import {type AdminCatalog, catalogSchema} from './catalog'

interface AdminCatalogFailed {
  readonly message: string
  readonly status: 'failed'
}

interface AdminCatalogReady {
  readonly catalog: AdminCatalog
  readonly status: 'ready'
}

export type AdminCatalogQueryResult = AdminCatalogFailed | AdminCatalogReady

const requestAdminCatalog = async (): Promise<AdminCatalogQueryResult> => {
  try {
    const response = await fetch('/api/admin/music')

    if (!response.ok) {
      throw new Error('음악 목록을 불러오지 못했습니다.')
    }

    return {catalog: catalogSchema.parse(await response.json()), status: 'ready'}
  } catch (error: unknown) {
    return {
      message: error instanceof Error ? error.message : '음악 목록을 불러오지 못했습니다.',
      status: 'failed',
    }
  }
}

export const adminCatalogQuery = query(requestAdminCatalog, 'admin-music-catalog')
