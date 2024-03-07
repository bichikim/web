import {styled} from 'src/style'
import {HDialog} from './HDialog'

export const UDialog = styled(HDialog, {
  '& .content': {
    boxShadow: '$lg',
  },
  left: 0,
  position: 'fixed',
  top: 0,
})
