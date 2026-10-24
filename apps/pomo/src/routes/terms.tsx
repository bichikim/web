import {Navigate} from '@solidjs/router'

import {SERVICE_POLICY_PATHS} from 'src/features/service-terms/policy-paths'

export default function LegacyTermsPage() {
  return <Navigate href={SERVICE_POLICY_PATHS.web.terms} />
}
