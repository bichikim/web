import {getExceptionMessage} from '../error-detail'
import {apiJsonRequest, parseJsonResponse} from '../api-json'
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
    const response = await apiJsonRequest('admin/music', {retry: false})

    if (!response.ok) {
      throw new Error('음악 목록을 불러오지 못했습니다.')
    }

    return {catalog: await parseJsonResponse(response, catalogSchema), status: 'ready'}
  } catch (error: unknown) {
    return {
      message: getExceptionMessage(error, '음악 목록을 불러오지 못했습니다.'),
      status: 'failed',
    }
  }
}

export const adminCatalogQuery = query(requestAdminCatalog, 'admin-music-catalog')
