import {emotion} from 'src/boot/emotion'
import {QImg} from 'quasar'

const {styled} = emotion()

export const TImg: any = styled(QImg)(
  {
    width: '100px',
    height: '100px',
  },
)
