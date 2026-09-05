import {clientOnly} from '@solidjs/start'

export const HwpWorkspace = clientOnly(
  () => import('src/components/dev/hwp/HwpDocumentWorkspace'),
  {
    lazy: true,
  },
)
