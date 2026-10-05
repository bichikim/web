import {type Accessor} from 'solid-js'
import {isServer} from 'solid-js/web'

/**
 * @deprecated use isServer from solid-js/web or clientOnly from @solidjs/start
 */
export const useIsClient = (): Accessor<boolean> => () => !isServer
