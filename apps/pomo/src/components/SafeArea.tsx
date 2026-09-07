import {Show} from 'solid-js'
import {AppsInToss} from './safe-area/AppsInToss'

export const SafeArea = () => (
  <Show when={import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true'}>
    <AppsInToss />
  </Show>
)
