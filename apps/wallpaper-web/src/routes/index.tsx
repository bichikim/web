import {Meta, Title} from '@solidjs/meta'
import {SWidgetPlayground} from '../components/SWidgetPlayground'

export default function Home() {
  return (
    <>
      <Title>Poffo Wallpaper — 캐릭터 위젯과 움직이는 배경화면</Title>
      <Meta
        name="description"
        content="캐릭터를 옮기고 배경을 바꿔 보세요. Poffo 캐릭터 위젯과 움직이는 배경화면을 위한 데스크톱 앱."
      />
      <Meta property="og:title" content="Poffo Wallpaper" />
      <Meta property="og:description" content="Poffo 캐릭터 위젯을 이 화면에서 체험해 보세요." />
      <Meta property="og:type" content="website" />
      <Meta property="og:url" content="https://wallpaper.poffo.io/" />
      <SWidgetPlayground />
    </>
  )
}
