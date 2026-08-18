import {useLocation, useNavigate} from '@solidjs/router'
import {onMount} from 'solid-js'

export default function LegacyDialoguePage() {
  const location = useLocation()
  const navigate = useNavigate()

  onMount(() => navigate(`/dialogue${location.search}`, {replace: true}))

  return null
}
