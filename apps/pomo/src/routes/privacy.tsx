import {Navigate} from '@solidjs/router'

import {SERVICE_POLICY_PATHS} from 'src/features/service-terms/policy-paths'

export default function LegacyPrivacyPage() {
  return <Navigate href={SERVICE_POLICY_PATHS.web.privacy} />
}
