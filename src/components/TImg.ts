import {emotion} from 'src/boot/emotion'
import {QImg} from 'quasar'

const {styled} = emotion()

export const TImg: any = styled(QImg)(
  {
    height: '100px',
    width: '100px',
  },
)
