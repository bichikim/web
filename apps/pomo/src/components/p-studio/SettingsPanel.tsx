import {clientOnly} from '@solidjs/start'

export const SceneSettingsPanel = clientOnly(() => import('../PSettings'), {lazy: true})
