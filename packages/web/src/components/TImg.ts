import {_createEmotion} from 'src/boot/emotion'
import {QImg} from 'quasar'

const {styled} = _createEmotion()

export const TImg: any = styled(QImg)(
  {
    width: '100px',
    height: '100px',
  },
)
