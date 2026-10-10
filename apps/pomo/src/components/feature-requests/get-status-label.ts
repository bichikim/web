import * as m from '@paraglide/message'
import type {FeatureRequestStatus} from '../../features/feature-requests'

export const getStatusLabel = (status: FeatureRequestStatus): string => {
  switch (status) {
    case 'completed':
      return m.feature_request_status_completed()
    case 'confirmed':
      return m.feature_request_status_confirmed()
    case 'requested':
      return m.feature_request_status_requested()
    case 'voting':
      return m.feature_request_status_voting()
    default: {
      const exhaustiveStatus: never = status
      return exhaustiveStatus
    }
  }
}
