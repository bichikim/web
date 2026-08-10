/// <reference types="@solidjs/start/env" />
/// <reference types="vite/client" />

import type {NeedleEngineAttributes, NeedleEngineWebComponent} from '@needle-tools/engine'
import type {JSX as SolidJsx} from 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'needle-engine': Partial<NeedleEngineAttributes> &
        SolidJsx.HTMLAttributes<NeedleEngineWebComponent>
    }
  }
}
