import {Navigate, useLocation} from '@solidjs/router'

export default function LegacyDialoguePage() {
  const location = useLocation()

  return <Navigate href={`/dialogue${location.search}`} />
}
