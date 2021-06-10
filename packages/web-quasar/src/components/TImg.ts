import {_createEmotion} from 'src/boot/emotion'
import {QImg} from 'quasar'

const {styled} = _createEmotion()

export const TImg = styled(QImg)(
  {
    backgroundColor: 'red',
    width: '100px',
    height: '100px',
  },
)
