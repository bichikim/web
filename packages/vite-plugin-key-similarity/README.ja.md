# `@winter-love/vite-plugin-key-similarity`

[English](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.md) · [한국어](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ko.md) · [日本語](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.ja.md) · [简体中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-CN.md) · [繁體中文](https://github.com/bichikim/web/blob/dev/packages/vite-plugin-key-similarity/README.zh-TW.md)

ソースコード内の静的文字列をローカル埋め込みモデルで比較し、意味が似ているキーを検出する Vite プラグインです。翻訳文、分析イベント、権限名など、文字列キーを受け取る任意のインポート関数に適用できます。

- インターネット接続や外部 API を使用しません。
- q8 `Xenova/multilingual-e5-small` モデルをパッケージに同梱しています。
- どの関数の何番目の引数をキーとするかを `keyDetector` で指定できます。
- Vite が実際に読み込んだモジュールを非同期 Worker で比較し、transform 処理への影響を抑えます。
- 類似キーとソース位置のみを報告し、コードは自動変更しません。

## 1. はじめに

プラグインを開発依存関係としてインストールします。

```bash
npm install --save-dev @winter-love/vite-plugin-key-similarity
```

Vite 設定にプラグインを追加し、`keyDetector` を指定します。次の設定例では、`./i18n` からインポートした `t()` の最初の引数を検査します。

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

通常どおり開発サーバーまたは本番ビルドを実行します。

```bash
npm run dev
npm run build
```

デフォルトの動作は次のとおりです。

- 開発サーバー: 類似キーを警告として表示します。
- 本番ビルド: 類似キーが見つかるとビルドを失敗させます。
- モデルとトークナイザー: パッケージの `assets` ディレクトリから自動的に読み込みます。環境変数やモデルパスの設定は不要です。

## 2. キーを選択する

### `keyDetector` の戻り値

`keyDetector` は import 情報と呼び出し引数を受け取り、その呼び出しを検査するかどうかを判定します。

| 戻り値                   | 意味                                                                 |
| ------------------------ | -------------------------------------------------------------------- |
| `0`、`1` などの数値      | そのインデックスの引数をグループなしのキーとして選択します。         |
| `{argumentIndex, group}` | そのインデックスの引数を選択し、同じグループのキーとのみ比較します。 |
| `undefined`              | 呼び出しを検査しません。                                             |

直接 import と alias import の両方に対応しています。

```ts
import {t, t as translate} from './i18n'

t('決済が完了しました。')
translate('決済処理が正常に完了しました。')
```

どちらの呼び出しでも `imported` は `t` です。2 番目の呼び出しでは `localName` が `translate` になります。同名のローカル関数や別モジュールからインポートした関数は、`source` 条件で除外できます。

### 検出コンテキスト

| プロパティ  | 内容                                 |
| ----------- | ------------------------------------ |
| `arguments` | 各引数の `kind` と静的文字列 `value` |
| `filePath`  | 呼び出しがあるファイルの絶対パス     |
| `imported`  | 元の import 名                       |
| `localName` | 現在のファイルで使用している名前     |
| `position`  | 呼び出し開始位置の行と列             |
| `source`    | import module specifier              |

たとえば、`emit(payload, key)` の 2 番目の引数を `analytics` グループとして検査するには、次のように設定します。

```ts
keySimilarity({
  keyDetector: ({arguments: args, filePath, imported, source}) => {
    if (filePath.endsWith('.story.tsx')) return undefined
    if (source !== '@/events' || imported !== 'emit') return undefined

    return args[1]?.kind !== 'dynamic' ? {argumentIndex: 1, group: 'analytics'} : undefined
  },
})
```

グループが不要な場合は、`{argumentIndex: 1, group: 'analytics'}` の代わりに `1` を返します。

## 3. 対応している文字列

次の静的な値を抽出できます。

```ts
t('シングルクォート文字列')
t('ダブルクォート文字列')
t(`静的な template literal`)
```

通常の文字列内にある `${email}` は、そのままの文字列として扱います。

```ts
t('パスワード再設定メールを ${email} に送信しました。')
```

Template expression 内の単純な識別子とプロパティアクセスも、同じ placeholder 形式に復元します。

```ts
t(`パスワード再設定メールを ${email} に送信しました。`)
t(`パスワード再設定メールを ${user.profile.email} に送信しました。`)
```

実行しなければ値が決まらない式は、静的キーとして比較しません。

```ts
t(message)
t(`こんにちは、${getName()}`)
t(`こんにちは、${name ?? fallback}`)
```

対応する拡張子は TS、TSX、JS、JSX、MTS、MJS です。named import と alias import に対応しています。オブジェクトメソッド、namespace import、Vue または Svelte の compiler AST には対応していません。

## 4. 呼び出しに比較表現を追加する

コード形式のキーだけでは意味が十分に伝わらない場合は、呼び出しの直前に `@key-similarity-with` を配置します。コメントの文とコードリテラルは、同じ呼び出しに属する比較表現として扱われます。

```ts
/* @key-similarity-with パスワード再設定メールを送信しました。 */
t('password.reset.email.sent')
```

診断には呼び出し位置が 1 回だけ表示されます。

```text
src/password.ts:4:1  password.reset.email.sent  [compared as: password.reset.email.sent | パスワード再設定メールを送信しました。]
```

### 複数の表現を追加する

`@key-similarity-with` を複数回記述すると、すべての表現が 1 つの呼び出しにまとめられます。

```ts
/* @key-similarity-with パスワード再設定メールを送信しました。 */
/* @key-similarity-with パスワード変更の案内メールを送信しました。 */
t('password.reset.email.sent')
```

2 つの呼び出しを比較するときは、すべての表現の組み合わせを評価し、しきい値を通過した組み合わせのうち最高スコアの 1 つだけを診断に残します。同じ呼び出しに属する表現同士は比較しません。

### コードリテラルを除外する

`@key-similarity-ignore-literal` と `with` を組み合わせると、コードリテラルを除外し、注釈に書いた文だけで比較できます。

```ts
/* @key-similarity-with 決済が完了しました。 */
/* @key-similarity-ignore-literal */
t('legacy.payment.completed')
```

`with` なしで `@key-similarity-ignore-literal` だけを使用すると、比較表現が 1 つも残らないため、その呼び出し全体が検査対象外になります。

```ts
/* @key-similarity-ignore-literal */
t('類似度検査から除外するキー')
```

注釈コメントは、呼び出しまたはその呼び出しを含む statement の直前に、連続したブロックとして記述してください。コメントとコードの間に空行があると、その注釈は呼び出しに関連付けられません。

## 5. 類似度のしきい値を調整する

`semanticThreshold` のデフォルト値は `0.9` です。スコアがしきい値以上の key pair だけを診断します。

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: 0.92,
})
```

ほとんどのプロジェクトでは、単一の固定値よりも、キーの長さに応じてしきい値を調整する関数を推奨します。キーの形式も条件にできます。resolver はコードリテラルと注釈で追加した各表現に対して個別に実行されます。

```ts
keySimilarity({
  keyDetector: ({imported, source}) => (source === './i18n' && imported === 't' ? 0 : undefined),
  semanticThreshold: (key) => (key.length < 10 ? 0.95 : 0.9),
})
```

2 つの表現でしきい値が異なる場合は、高い方を適用します。しきい値を上げると診断が減り、下げると増えます。実際のプロジェクトで、類似と判定したい文と別の文として扱いたい文の両方を用意して調整してください。

## 6. 診断結果を読む

診断は次の形式で表示されます。

```text
Similar key groups:
Group 1 (3 keys):
src/main.ts:6:3  決済が完了しました。
src/paraphrase.ts:3:35  決済処理が正常に完了しました。
src/secondary.ts:3:33  決済に成功しました。
group=ungrouped, semantic=0.9560–0.9843/0.9000
```

- `Group 1 (3 keys)`: すべての組み合わせが類似している 3 つの呼び出しです。
- `src/main.ts:6:3`: 最終的な Vite `root` からの相対ファイル、行、列です。
- `group=ungrouped`: `keyDetector` が数値を返し、グループを指定していません。
- `semantic=0.9560–0.9843/0.9000`: グループ内の pair スコア範囲と、適用したしきい値です。

`A≈B`、`B≈C`、`A≉C` のような推移的なつながりは 1 つのグループに統合しません。すべての pair が実際に類似している完全なグループに分けて表示します。

このプラグインは、どのキーを残すか、または削除するかを決定しません。表示された位置を確認し、キーを統合するか、文脈上別の文として維持するかを判断してください。

## 7. 診断モード

| オプション  | デフォルト | 設定値                 | 動作                     |
| ----------- | ---------- | ---------------------- | ------------------------ |
| `serveMode` | `warn`     | `off`, `warn`          | 開発サーバーの診断モード |
| `buildMode` | `error`    | `off`, `warn`, `error` | 本番ビルドの診断モード   |

`off` を選択すると、Worker とモデルも初期化しません。非同期比較はキューに追加した transform の後に完了するため、開発モードでは `error` を提供していません。

既存の類似キーが多いプロジェクトへ導入するときは、まず `buildMode: 'warn'` で結果を整理し、その後 `error` に切り替えられます。

## 8. オプション一覧

| オプション          | デフォルト                             | 説明                                                      |
| ------------------- | -------------------------------------- | --------------------------------------------------------- |
| `keyDetector`       | 必須                                   | 検査する import 呼び出しとキー引数を選択します。          |
| `semanticThreshold` | `0.9`                                  | 固定値または `(key) => number` 形式のしきい値 resolver    |
| `serveMode`         | `warn`                                 | 開発サーバーの診断モード                                  |
| `buildMode`         | `error`                                | 本番ビルドの診断モード                                    |
| `exclude`           | テスト、generated、node_modules を除外 | Vite と CLI で除外する glob パターン                      |
| `scanInclude`       | `src/**/*.{ts,tsx,js,jsx,mts,mjs}`     | CLI の全体スキャンだけで使用するファイル glob             |
| `cacheDir`          | `node_modules/.cache/key-similarity`   | モデルキャッシュと `vectors` キャッシュの基準ディレクトリ |
| `modelPath`         | 同梱モデル                             | 別のローカル Transformers.js モデルへのパス               |
| `modelIdentifier`   | 同梱モデル ID または `modelPath`       | ベクトルキャッシュを区別するモデル識別子                  |
| `modelRevision`     | 同梱 revision または `local`           | ベクトルキャッシュを区別するモデル revision               |
| `wasmPath`          | 自動選択                               | ONNX WASM ファイルへの明示的なパス                        |

Vite 共通の `include` オプションはありません。Vite モジュールグラフ内の JavaScript と TypeScript ファイルを検査し、`exclude` だけを適用します。プロジェクト全体を検査する場合に限り、CLI 専用の `scanInclude` を使用します。

## 9. CLI でプロジェクト全体を検査する

Vite ビルドとは別にプロジェクト全体を検査するには、プロジェクトルートに `key-similarity.config.mjs` を作成します。

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

- `check`: 検査したファイル数、一意なキー数、診断数を表示します。診断がある場合は終了コード `1` を返します。
- `check --json`: 位置、比較表現、スコア、実行時間を JSON で表示します。
- `benchmark`: 同じモデルインスタンスで initial/warm 検査を行い、埋め込み時間、キャッシュサイズ、RSS memory を JSON で表示します。
- `--config path`: デフォルトの `key-similarity.config.mjs` 以外の設定ファイルを読み込みます。

CLI は現在の作業ディレクトリをルートとして使用します。

## 10. モデルとキャッシュ

デフォルトのモデルとトークナイザーは `assets/multilingual-e5-small` に含まれています。Transformers.js のリモートモデルアクセスを無効にしているため、実行時にモデルをダウンロードしません。

正規化した文字列のベクトルは、デフォルトで `node_modules/.cache/key-similarity/vectors` に保存します。モデル ID、revision、正規化バージョン、正規化文字列が一致する場合はベクトルを再利用します。別のローカルモデルを使用するときは、以前のベクトルキャッシュと混在しないように `modelIdentifier` と `modelRevision` も指定してください。

## 11. 実行の仕組み

Vite モードでは次の順序で処理します。

1. Vite がファイルを読み込み、`transform` に渡します。
2. メインスレッドが AST からキーと位置を即座に抽出し、キューへ追加します。
3. 別の Node Worker がキューを順番に処理し、埋め込みと比較を行います。
4. ファイルが変更または削除されると、そのファイルを含む以前の pair を削除します。
5. `buildEnd` でキューが空になるまで待機し、蓄積した結果を 1 回だけ報告します。

Vite モードは、ビルド前にソースディレクトリ全体を glob でスキャンしません。現在のビルドまたは開発サーバーのモジュールグラフに含まれるファイルだけを検査します。

## 12. トラブルシューティング

### 類似した文が表示されない

次の順序で確認してください。

1. ファイルが現在の Vite モジュールグラフに import されていることを確認します。
2. `source` と `imported` が `keyDetector` の条件と完全に一致することを確認します。
3. 2 つの呼び出しが異なる `group` に分類されていないことを確認します。
4. 選択した引数が対応している静的文字列であることを確認します。
5. `semanticThreshold` を少し下げ、実際のスコアを確認します。

コード形式のキーから意味を十分に読み取れない場合は、`@key-similarity-with` で人が読める表現を追加してください。

### 関係のない文まで多数表示される

`semanticThreshold` を上げます。すべてのキーに同じ値を適用しにくい場合は、`(key) => number` resolver を指定します。比較してはいけないキーの種類は、`keyDetector` のグループで分離します。

### 開発サーバーでは警告になるが、本番ビルドは失敗する

デフォルトが `serveMode: 'warn'`、`buildMode: 'error'` だからです。本番ビルドでも警告だけを表示する場合は、`buildMode: 'warn'` を指定します。

### 対象外のファイルが検査される

対象ファイルの glob を `exclude` に追加します。Vite 全体に適用する `include` オプションはないため、`keyDetector` の `filePath`、`source`、`imported` 条件で呼び出しを制限してください。

## 13. 同梱している例

パッケージルートで次のコマンドを実行できます。すべての例で同梱のローカルモデルを使用します。

```bash
npm run example:duplicate
npm run example:clean
npm run example:sentence-duplicate
npm run example:sentence-clean
```

- `example:duplicate`: `checkout.complete` と `checkout.completed` を診断します。
- `example:clean`: 関係のないイベントキーを使用し、診断なしで完了します。
- `example:sentence-duplicate`: 決済文、パスワード再設定文、placeholder、注釈で関連付けたコード形式のキーを報告します。`@key-similarity-ignore-literal` で検査から除外した類似文も含みます。
- `example:sentence-clean`: 関係のない翻訳文を使用し、診断なしで完了します。
