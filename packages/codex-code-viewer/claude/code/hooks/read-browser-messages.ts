import {resolveViewerLanguage} from '../../../src/viewer/locale/resolve-viewer-language'

const english = {
  attachmentError: 'Could not retrieve attachments.',
  browserError: 'Could not open Browser.',
  browserTabsError: 'Could not check Browser tabs.',
  fileError: 'Could not open the file.',
  openViewer: 'Open Code Viewer',
  revealError: 'Could not expand Browser.',
  revealHint: 'If Browser is collapsed, click Browser at the top.',
  selectError: 'Could not select the Code Viewer tab.',
  sendError: 'Could not retrieve Code Viewer attachments. Please send again.',
  urlError: 'Could not retrieve the viewer URL.',
  urlInvalid: 'The viewer URL is not an authenticated local address.',
}

const korean: Readonly<Record<keyof typeof english, string>> = {
  attachmentError: '첨부를 가져오지 못했습니다.',
  browserError: 'Browser를 열지 못했습니다.',
  browserTabsError: 'Browser 탭을 확인하지 못했습니다.',
  fileError: '파일을 열지 못했습니다.',
  openViewer: '코드 뷰어 열기',
  revealError: 'Browser를 펼치지 못했습니다.',
  revealHint: 'Browser가 접혀 있으면 상단 Browser를 누르세요.',
  selectError: 'Code Viewer 탭을 선택하지 못했습니다.',
  sendError: 'Code Viewer 첨부를 가져오지 못했습니다. 다시 보내 주세요.',
  urlError: '뷰어 주소를 받지 못했습니다.',
  urlInvalid: '인증된 로컬 뷰어 주소가 아닙니다.',
}

const japanese: Readonly<Record<keyof typeof english, string>> = {
  attachmentError: '添付を取得できませんでした。',
  browserError: 'Browserを開けませんでした。',
  browserTabsError: 'Browserのタブを確認できませんでした。',
  fileError: 'ファイルを開けませんでした。',
  openViewer: 'コードビューアーを開く',
  revealError: 'Browserを展開できませんでした。',
  revealHint: 'Browserが折りたたまれている場合は、上部のBrowserをクリックしてください。',
  selectError: 'Code Viewerのタブを選択できませんでした。',
  sendError: 'Code Viewerの添付を取得できませんでした。もう一度送信してください。',
  urlError: 'ビューアーのURLを取得できませんでした。',
  urlInvalid: 'ビューアーのURLが認証済みのローカルアドレスではありません。',
}

const chinese: Readonly<Record<keyof typeof english, string>> = {
  attachmentError: '无法获取附件。',
  browserError: '无法打开 Browser。',
  browserTabsError: '无法检查 Browser 标签页。',
  fileError: '无法打开文件。',
  openViewer: '打开代码查看器',
  revealError: '无法展开 Browser。',
  revealHint: '如果 Browser 已折叠，请点击顶部的 Browser。',
  selectError: '无法选择 Code Viewer 标签页。',
  sendError: '无法获取 Code Viewer 附件。请重新发送。',
  urlError: '无法获取查看器地址。',
  urlInvalid: '查看器地址不是经过验证的本地地址。',
}

const spanish: Readonly<Record<keyof typeof english, string>> = {
  attachmentError: 'No se han podido obtener los archivos adjuntos.',
  browserError: 'No se ha podido abrir Browser.',
  browserTabsError: 'No se han podido comprobar las pestañas de Browser.',
  fileError: 'No se ha podido abrir el archivo.',
  openViewer: 'Abrir visor de código',
  revealError: 'No se ha podido expandir Browser.',
  revealHint: 'Si Browser está contraído, pulsa Browser en la parte superior.',
  selectError: 'No se ha podido seleccionar la pestaña de Code Viewer.',
  sendError:
    'No se han podido obtener los archivos adjuntos de Code Viewer. Vuelve a enviar el mensaje.',
  urlError: 'No se ha podido obtener la URL del visor.',
  urlInvalid: 'La URL del visor no es una dirección local autenticada.',
}

const translations = {en: english, es: spanish, ja: japanese, ko: korean, 'zh-CN': chinese}

export const readBrowserMessages = (
  locale: string | undefined,
): Readonly<Record<keyof typeof english, string>> => translations[resolveViewerLanguage(locale)]
