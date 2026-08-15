import affectionFace from '../../../assets/pomodoro-status-icons/affection-face.webp'
import angerFace from '../../../assets/pomodoro-status-icons/anger-face.webp'
import anxietyFace from '../../../assets/pomodoro-status-icons/anxiety-face.webp'
import calmFace from '../../../assets/pomodoro-status-icons/calm-face.webp'
import dreamlikeFace from '../../../assets/pomodoro-status-icons/dreamlike-face.webp'
import fearFace from '../../../assets/pomodoro-status-icons/fear-face.webp'
import hopeFace from '../../../assets/pomodoro-status-icons/hope-face.webp'
import joyFace from '../../../assets/pomodoro-status-icons/joy-face.webp'
import longingFace from '../../../assets/pomodoro-status-icons/longing-face.webp'
import neutralFace from '../../../assets/pomodoro-status-icons/neutral-face.webp'
import sadnessFace from '../../../assets/pomodoro-status-icons/sadness-face.webp'
import wonderFace from '../../../assets/pomodoro-status-icons/wonder-face.webp'
import type {PrimaryMoodId} from './labels'

const PRIMARY_MOOD_ICONS = {
  angry: angerFace,
  anxious: anxietyFace,
  awe: wonderFace,
  calm: calmFace,
  cheerful: joyFace,
  dreamlike: dreamlikeFace,
  fearful: fearFace,
  hopeful: hopeFace,
  neutral: neutralFace,
  nostalgic: longingFace,
  sad: sadnessFace,
  warm: affectionFace,
} satisfies Record<PrimaryMoodId, string>

export const getPrimaryMoodIcon = (id: PrimaryMoodId) => PRIMARY_MOOD_ICONS[id]
