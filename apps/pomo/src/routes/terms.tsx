import {Navigate} from '@solidjs/router'

import {SERVICE_POLICY_PATHS} from 'src/config/service-policy'

export default function LegacyTermsPage() {
  return <Navigate href={SERVICE_POLICY_PATHS.web.terms} />
}
