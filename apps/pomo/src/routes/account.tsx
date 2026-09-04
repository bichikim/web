import {useSearchParams} from '@solidjs/router'

import {AccountPage} from '../components/AccountPage'
import {isCalendarProviderId} from '../features/calendar'

const AccountRoute = () => {
  const [searchParams] = useSearchParams()
  const provider = () => {
    const currentProvider = searchParams.provider

    return searchParams.calendar === 'connected' &&
      typeof currentProvider === 'string' &&
      isCalendarProviderId(currentProvider)
      ? currentProvider
      : undefined
  }

  return <AccountPage connectedCalendarProvider={provider()} />
}

export default AccountRoute
