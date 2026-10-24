import {useMediaQuery} from 'src/hooks/use-media-query'

const MOBILE_LAYOUT_QUERY = '(width < 28rem)'

/** Reports the client viewport's Pomo mobile layout state after hydration. */
export const useMobileLayout = () => useMediaQuery(MOBILE_LAYOUT_QUERY)
