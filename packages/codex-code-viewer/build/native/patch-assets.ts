import {createHash} from 'node:crypto'

export const NATIVE_BUILD = '26.930.61225'
export const NATIVE_ASSETS = [
  {
    hash: '8c11b76e960300895e8a3dde8b2613f87c92ed226b58173aa73ceaff9cd2b604',
    name: 'app-initial-69cd8dbddec5.js',
  },
  {
    hash: 'cea692839027735205efb3f0fdead420650c321bc806653e5fc286a809eb67c9',
    name: 'view-frame-2842518d8813.js',
  },
  {
    hash: '9ec0da8b82138e3a5761a08eab29162f011328d0f1c2f073575f924c583b88b8',
    name: 'side-panel-tab-frame-93553b284b6f.js',
  },
] as const

interface PatchInput {
  readonly version: string
  readonly sources: ReadonlyMap<string, string>
  readonly helper: string
}

const replaceOnce = (source: string, previous: string, next: string): string => {
  if (source.split(previous).length !== 2) {
    throw new Error(`Native patch anchor is absent or ambiguous: ${previous}`)
  }
  return source.replace(previous, () => next)
}

/** Patches only the three checksum-verified assets of the supported local app build. */
export const patchAssets = ({version, sources, helper}: PatchInput): Map<string, string> => {
  if (version !== NATIVE_BUILD) {
    throw new Error(`Unsupported Codex build: ${version}`)
  }
  for (const asset of NATIVE_ASSETS) {
    const source = sources.get(asset.name)
    if (source === undefined || createHash('sha256').update(source).digest('hex') !== asset.hash) {
      throw new Error(`Native asset checksum does not match: ${asset.name}`)
    }
  }
  const initial = sources.get(NATIVE_ASSETS[0].name)!
  let frame = sources.get(NATIVE_ASSETS[1].name)!
  const panel = sources.get(NATIVE_ASSETS[2].name)!
  frame = replaceOnce(
    frame,
    'zvn as ct}from"./app-initial-69cd8dbddec5.js"',
    'zvn as ct,winterLoveFileLocation}from"./app-initial-69cd8dbddec5.js"',
  )
  frame = replaceOnce(
    frame,
    'switch(e.method){case`tools/call`:',
    'switch(e.method){case`winter-love/file-viewer/location`:i();' +
      'return winterLoveFileLocation(E,c,C,e.params);case`tools/call`:',
  )
  frame = replaceOnce(
    frame,
    'Q={...X,...Z}',
    'Q={...X,...Z,...(c!=null&&y!=null&&C.tool.name===`code.file`?' +
      '{"winter-love/file-viewer/location":{version:1}}:{})}',
  )
  frame = replaceOnce(
    frame,
    'an=x==null?[]:[Ze]',
    'an=[...(x==null?[]:[Ze]),...(c!=null&&y!=null&&C.tool.name===`code.file`?' +
      '[`winter-love/file-viewer/location`]:[])]',
  )
  const bridge = `
export function winterLoveFileLocation(scope,tabId,view,request){
  if(tabId==null)throw Error("A native file tab is required.");
  const panel=WM(scope,tabId);
  if(panel==null)throw Error("The native file tab has closed.");
  const controller=UM(panel),tab=scope.get(controller.tabById$,tabId);
  if(tab==null)throw Error("The native file tab has closed.");
  const update=WinterLoveNative.createTabLocation({tab,request,
    hostId:view.hostId,server:view.server,
    workspace:tab.durableRoute?.params.cwd??scope.get(RO)});
  controller.updateTab(scope,tabId,update);
  return {};
}
`
  return new Map([
    [NATIVE_ASSETS[0].name, `${initial}\n${helper}\n${bridge}`],
    [NATIVE_ASSETS[1].name, frame],
    [
      NATIVE_ASSETS[2].name,
      replaceOnce(
        panel,
        'filePath:n.path,fileViewer:n.view',
        'filePath:n.initialPath??n.path,fileViewer:n.view',
      ),
    ],
  ])
}
