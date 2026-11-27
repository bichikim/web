import {HydrationScript} from '@solidjs/web'
import type {ParentProps} from 'solid-js'

export default function Document(props: ParentProps) {
  return (
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf9f6" />
        <title>Poffo Wallpaper — 캐릭터 위젯과 움직이는 배경화면</title>
        <meta
          name="description"
          content="캐릭터를 옮기고 배경을 바꿔 보세요. Poffo 캐릭터 위젯과 움직이는 배경화면을 위한 데스크톱 앱."
        />
        <meta property="og:title" content="Poffo Wallpaper" />
        <meta property="og:description" content="Poffo 캐릭터 위젯을 이 화면에서 체험해 보세요." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wallpaper.poffo.io/" />
        <link rel="icon" href="/favicon.png?v=butterfly" type="image/png" sizes="64x64" />
        <HydrationScript />
      </head>
      <body>
        <div id="root">{props.children}</div>
      </body>
    </html>
  )
}
