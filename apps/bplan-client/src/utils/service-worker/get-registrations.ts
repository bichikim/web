import {getWindow} from '@winter-love/utils'

export const getRegistrations = async (): Promise<
  readonly ServiceWorkerRegistration[]
> => {
  const window = getWindow()

  if (!window) {
    return []
  }

  const {serviceWorker} = window.navigator

  if ('getRegistrations' in serviceWorker) {
    return serviceWorker.getRegistrations()
  }

  return [await navigator.serviceWorker.ready]
}

export const skipWaiting = async (registration?: ServiceWorkerRegistration) => {
  if (!registration) {
    return
  }

  registration.waiting?.postMessage({type: 'SKIP_WAITING'})
}
