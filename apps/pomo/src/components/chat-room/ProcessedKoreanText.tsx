import {useKoreanTextSegments} from '../../features/korean-text-postprocessor/index'
import {KoreanTextRenderer} from '../KoreanTextRenderer'

interface ProcessedKoreanTextProps {
  readonly text: string
}

export const ProcessedKoreanText = (props: ProcessedKoreanTextProps) => {
  const segments = useKoreanTextSegments({text: () => props.text})

  return <KoreanTextRenderer segments={segments()} />
}
