import tadaJson from './tada.json?url'
import {Lottie} from 'src/components/lottie/Lottie'

export const TadaDemo = () => {
  return <Lottie src={tadaJson} play="autoplay" loop />
}
