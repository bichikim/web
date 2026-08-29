import {clientOnly} from '@solidjs/start'

export const LearningPanel = clientOnly(() => import('../PLearning'), {lazy: true})
