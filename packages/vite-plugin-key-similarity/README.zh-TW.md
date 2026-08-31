# `@winter-love/vite-plugin-key-similarity`

[English](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.md) · [한국어](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ko.md) · [日本語](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ja.md) · [简体中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-CN.md) · [繁體中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-TW.md)

這是一個 Vite 外掛，使用本機嵌入模型比較原始碼中的靜態字串，以找出語意相近的 key。翻譯文案、分析事件、權限名稱等任何以字串作為 key 的匯入函式都能使用此外掛。

- 不使用網路連線或外部 API。
- 套件內附 q8 `Xenova/multilingual-e5-small` 模型。
- 透過 `keyDetector` 決定要檢查哪個函式及其第幾個引數。
- 在非同步 Worker 中比較 Vite 實際載入的模組，降低對 transform 流程的影響。
- 只回報相似 key 及其原始碼位置，不會自動修改程式碼。

## 1. 快速開始

將外掛安裝為開發相依套件。

```bash
npm install --save-dev @winter-love/vite-plugin-key-similarity
```

在 Vite 設定中加入外掛，並提供 `keyDetector`。以下範例設定會檢查從 `./i18n` 匯入之 `t()` 的第一個引數。

```ts
import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  plugins: [
    keySimilarity({
      keyDetector: ({imported, source}) =>
        source === './i18n' && imported === 't' ? 0 : undefined,
    }),
  ],
})
```

接著照常啟動開發伺服器或執行正式環境建置。

```bash
npm run dev
npm run build
```

預設行為如下：

- 開發伺服器：以警告形式回報相似 key。
- 正式環境建置：發現相似 key 時讓建置失敗。
- 模型與 tokenizer：自動從套件內的 `assets` 資料夾載入，不需要設定環境變數或模型路徑。

## 2. 選擇 key

### `keyDetector` 回傳值

`keyDetector` 會收到 import 資訊與呼叫引數，並判斷是否要檢查該次呼叫。

| 回傳值                   | 意義                                              |
| ------------------------ | ------------------------------------------------- |
| `0`、`1` 等數字          | 選擇該索引的引數作為未分組 key。                  |
| `{argumentIndex, group}` | 選擇該索引的引數，並且只與相同群組中的 key 比較。 |
| `undefined`              | 忽略該次呼叫。                                    |

支援直接 named import 與 alias import。

```ts
import {t, t as translate} from './i18n'

t('付款已完成。')
translate('付款程序已順利完成。')
```

兩次呼叫的 `imported` 都是 `t`。第二次呼叫的 `localName` 是 `translate`。可以透過 `source` 條件排除同名的區域函式，或從其他模組匯入的函式。

### 偵測內容

| 屬性        | 內容                                 |
| ----------- | ------------------------------------ |
| `arguments` | 每個引數的 `kind` 與靜態字串 `value` |
| `filePath`  | 呼叫所在檔案的絕對路徑               |
| `imported`  | 原始 import 名稱                     |
| `localName` | 目前檔案中使用的名稱                 |
| `position`  | 呼叫起始位置的行與欄                 |
| `source`    | import module specifier              |

例如，以下偵測器會檢查 `emit(payload, key)` 的第二個引數，並將它放入 `analytics` 群組。

```ts
keySimilarity({
  keyDetector: ({arguments: args, filePath, imported, source}) => {
    if (filePath.endsWith('.story.tsx')) return undefined
    if (source !== '@/events' || imported !== 'emit') return undefined

    return args[1]?.kind !== 'dynamic' ? {argumentIndex: 1, group: 'analytics'} : undefined
  },
})
```

如果不需要群組，請回傳 `1`，而不是 `{argumentIndex: 1, group: 'analytics'}`。

## 3. 支援的字串

擷取器支援以下靜態值。

```ts
t('單引號字串')
t('雙引號字串')
t(`靜態 template literal`)
```

一般字串中的 `${email}` 會保留為原始文字。

```ts
t('密碼重設電子郵件已寄送至 ${email}。')
```

Template expression 中的簡單識別字與屬性存取，也會還原成相同的 placeholder 形式。

```ts
t(`密碼重設電子郵件已寄送至 ${email}。`)
t(`密碼重設電子郵件已寄送至 ${user.profile.email}。`)
```

必須執行才能確定值的運算式，不會作為靜態 key 參與比較。

```ts
t(message)
t(`你好，${getName()}`)
t(`你好，${name ?? fallback}`)
```

支援的原始碼副檔名為 TS、TSX、JS、JSX、MTS 與 MJS。支援 named import 與 alias import。不支援物件方法、namespace import，也不支援 Vue 或 Svelte 的 compiler AST。

## 4. 為呼叫加入比較文字

當程式碼形式的 key 無法清楚表達含意時，請在呼叫正上方加入 `@key-similarity-with`。註解中的文字與程式碼字面值會成為同一次呼叫的多個比較表示。

```ts
/* @key-similarity-with 密碼重設電子郵件已寄出。 */
t('password.reset.email.sent')
```

診斷結果仍然只會顯示一次呼叫位置。

```text
src/password.ts:4:1  password.reset.email.sent  [compared as: password.reset.email.sent | 密碼重設電子郵件已寄出。]
```

### 加入多個表示

多次使用 `@key-similarity-with`，可以把多個表示附加到同一次呼叫。

```ts
/* @key-similarity-with 密碼重設電子郵件已寄出。 */
/* @key-similarity-with 密碼變更說明已透過電子郵件寄出。 */
t('password.reset.email.sent')
```

比較兩次呼叫時，外掛會評估所有表示組合，並在通過閾值的組合中只保留分數最高的一項。同一次呼叫中的表示不會互相比較。

### 排除程式碼字面值

將 `@key-similarity-ignore-literal` 與 `with` 一起使用，可以排除程式碼字面值，只比較註解中的文字。

```ts
/* @key-similarity-with 付款已完成。 */
/* @key-similarity-ignore-literal */
t('legacy.payment.completed')
```

如果只使用 `@key-similarity-ignore-literal` 而沒有 `with`，就不會留下任何比較表示，因此整次呼叫都會從檢查中排除。

```ts
/* @key-similarity-ignore-literal */
t('不參與相似度檢查的 key')
```

註解必須形成連續的註解區塊，緊貼在呼叫或包含該呼叫的 statement 上方。註解與程式碼之間如果有空白行，註解就不會綁定到該次呼叫。

## 5. 調整相似度閾值

`semanticThreshold` 的預設值是 `0.9`。只有分數大於或等於閾值的 key pair 才會被回報。

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: 0.92,
})
```

對於大多數專案，建議使用依 key 長度調整閾值的函式，而不是單一的固定值。也可以將 key 格式作為條件。程式碼字面值和每個註解表示都會分別呼叫該 resolver。

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: (key) => (key.length < 10 ? 0.95 : 0.9),
})
```

兩個表示的閾值不同時，會使用較高的閾值。提高閾值會減少診斷，降低閾值會增加診斷。建議同時準備實際專案中應該相符的文字，以及必須保持獨立的文字，再據此校準閾值。

## 6. 閱讀診斷結果

診斷結果使用以下格式。

```text
Similar key groups:
Group 1 (3 keys):
src/main.ts:6:3  付款已完成。
src/paraphrase.ts:3:35  付款程序已順利完成。
src/secondary.ts:3:33  付款已成功完成。
group=ungrouped, semantic=0.9560–0.9843/0.9000
```

- `Group 1 (3 keys)`：三次呼叫之間的每一種組合都相似。
- `src/main.ts:6:3`：相對於最終 Vite `root` 的檔案、行與欄。
- `group=ungrouped`：`keyDetector` 回傳了數字，沒有指定群組。
- `semantic=0.9560–0.9843/0.9000`：群組內 pair 的分數範圍，以及套用的閾值。

像 `A≈B`、`B≈C`、`A≉C` 這樣的傳遞鏈不會合併成單一群組。診斷會將其拆分為所有 pair 都實際相似的完整群組，以保留原始關係。

外掛不會決定應該保留或刪除哪個 key。請檢查回報的位置，並依據使用情境決定是否合併這些 key，或繼續將它們保留為不同文字。

## 7. 診斷模式

| 選項        | 預設值  | 可用值                 | 行為                   |
| ----------- | ------- | ---------------------- | ---------------------- |
| `serveMode` | `warn`  | `off`, `warn`          | 開發伺服器的診斷模式   |
| `buildMode` | `error` | `off`, `warn`, `error` | 正式環境建置的診斷模式 |

選擇 `off` 時也不會初始化 Worker 與模型。非同步比較會在觸發加入佇列的 transform 之後完成，因此開發模式不提供 `error`。

如果專案中已存在許多相似 key，可以先使用 `buildMode: 'warn'` 整理初始結果，清理完成後再切換到 `error`。

## 8. 選項參考

| 選項                | 預設值                               | 說明                                        |
| ------------------- | ------------------------------------ | ------------------------------------------- |
| `keyDetector`       | 必填                                 | 選擇要檢查的 import 呼叫與包含 key 的引數。 |
| `semanticThreshold` | `0.9`                                | 固定數字或 `(key) => number` 閾值 resolver  |
| `serveMode`         | `warn`                               | 開發伺服器診斷模式                          |
| `buildMode`         | `error`                              | 正式環境建置診斷模式                        |
| `exclude`           | 排除測試、generated 與 node_modules  | Vite 與 CLI 檢查中排除的 glob 模式          |
| `scanInclude`       | `src/**/*.{ts,tsx,js,jsx,mts,mjs}`   | 僅供 CLI 全專案掃描使用的檔案 glob          |
| `cacheDir`          | `node_modules/.cache/key-similarity` | 模型快取與 `vectors` 快取的基礎目錄         |
| `modelPath`         | 內附模型                             | 其他本機 Transformers.js 模型的路徑         |
| `modelIdentifier`   | 內附模型 ID 或 `modelPath`           | 用來區分向量快取的模型識別碼                |
| `modelRevision`     | 內附 revision 或 `local`             | 用來區分向量快取的模型 revision             |
| `wasmPath`          | 自動選擇                             | ONNX WASM 檔案的明確路徑                    |

Vite 沒有共用的 `include` 選項。Vite 會檢查其模組圖中的 JavaScript 與 TypeScript 檔案，並只套用 `exclude`。只有在需要全專案掃描時，才使用 CLI 專用的 `scanInclude`。

## 9. 使用 CLI 掃描整個專案

如果要獨立於 Vite 建置掃描整個專案，請在專案根目錄建立 `key-similarity.config.mjs`。

```js
export default {
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  scanInclude: ['src/**/*.{ts,tsx}'],
}
```

```bash
npx key-similarity check
npx key-similarity check --json
npx key-similarity benchmark
```

- `check`：輸出掃描的檔案數、唯一 key 數與診斷數。存在診斷時回傳結束碼 `1`。
- `check --json`：以 JSON 輸出位置、比較表示、分數與執行時間。
- `benchmark`：使用同一個模型執行個體進行 initial/warm 分析，並以 JSON 輸出嵌入時間、快取大小與 RSS memory。
- `--config path`：載入預設 `key-similarity.config.mjs` 以外的設定檔。

CLI 使用目前的工作目錄作為根目錄。

## 10. 模型與快取

預設模型與 tokenizer 位於 `assets/multilingual-e5-small`。Transformers.js 的遠端模型存取已停用，因此執行時不會下載模型。

正規化字串的向量預設儲存在 `node_modules/.cache/key-similarity/vectors`。模型 ID、revision、正規化版本與正規化字串都相同時，會重複使用既有向量。切換到其他本機模型時，請同時設定 `modelIdentifier` 與 `modelRevision`，避免與先前的模型快取混用。

## 11. 執行流程

Vite 模式會依照以下順序處理檔案。

1. Vite 載入檔案並將其傳給 `transform`。
2. 主執行緒立即從 AST 擷取 key 與位置，並將其加入佇列。
3. 獨立的 Node Worker 依序取出佇列工作，執行嵌入與比較。
4. 檔案變更或刪除時，會移除所有包含該檔案的舊 pair。
5. 在 `buildEnd` 階段，建置會等待佇列清空，再一次回報累積結果。

Vite 模式不會在建置前使用 glob 掃描整個原始碼目錄。它只檢查目前建置或開發伺服器模組圖中包含的檔案。

## 12. 疑難排解

### 相似文字沒有被回報

請依照以下順序檢查。

1. 確認檔案已 import 至目前的 Vite 模組圖。
2. 確認 `source` 與 `imported` 完全符合 `keyDetector` 條件。
3. 確認兩次呼叫沒有被分配到不同的 `group`。
4. 確認所選引數是支援的靜態字串。
5. 稍微降低 `semanticThreshold`，查看實際分數。

如果程式碼形式的 key 無法表達足夠語意，請使用 `@key-similarity-with` 加入容易閱讀的文字。

### 回報了太多無關文字

提高 `semanticThreshold`。如果單一值不適合所有 key，請提供 `(key) => number` resolver。絕對不能互相比較的 key 類別，請使用 `keyDetector` 群組分隔。

### 開發伺服器只顯示警告，但正式環境建置失敗

預設值是 `serveMode: 'warn'` 與 `buildMode: 'error'`。如果正式環境建置也只需要警告，請設定 `buildMode: 'warn'`。

### 檢查了範圍外的檔案

將對應的 glob 加入 `exclude`。由於 Vite 沒有外掛層級的 `include` 選項，請透過 `keyDetector` 中的 `filePath`、`source` 與 `imported` 條件限制呼叫範圍。

## 13. 內附範例

請在套件根目錄執行以下指令。所有範例都使用內附的本機模型。

```bash
npm run example:duplicate
npm run example:clean
npm run example:sentence-duplicate
npm run example:sentence-clean
```

- `example:duplicate`：回報 `checkout.complete` 與 `checkout.completed`。
- `example:clean`：使用不相關的事件 key，不會產生診斷。
- `example:sentence-duplicate`：回報付款文字、密碼重設文字、placeholder，以及透過註解關聯的程式碼形式 key。也包含一個使用 `@key-similarity-ignore-literal` 從檢查中排除的相似文字。
- `example:sentence-clean`：使用不相關的翻譯文字，不會產生診斷。
