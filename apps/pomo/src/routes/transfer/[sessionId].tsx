import {Navigate, useLocation, useParams} from '@solidjs/router'

export default function TransferPage() {
  const params = useParams<{sessionId: string}>()
  const location = useLocation()
  return (
    <Navigate
      href={`/?tool=transfer&session=${encodeURIComponent(params.sessionId)}${location.hash}`}
    />
  )
}
