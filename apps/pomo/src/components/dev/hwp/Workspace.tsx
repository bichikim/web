import {clientOnly} from '@solidjs/start'

export const HwpWorkspace = clientOnly(
  async () => {
    const {HwpDocumentWorkspace} = await import('src/components/dev/hwp/HwpDocumentWorkspace')
    return {default: HwpDocumentWorkspace}
  },
  {
    lazy: true,
  },
)
