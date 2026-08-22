import {Navigate} from '@solidjs/router'

import {SERVICE_POLICY_PATHS} from 'src/config/service-policy'

export default function LegacyPrivacyPage() {
  return <Navigate href={SERVICE_POLICY_PATHS.web.privacy} />
}
