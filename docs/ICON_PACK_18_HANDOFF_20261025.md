# APP-025｜観光・施設アイコン18種類（2026-10-25）

## 保存成果

**原画**：「レトロな日本観光アイコン18種スプライトシート.png」（ChatGPT生成 1774×887px）。GitHubにはその18点を切り出してまとめた**透過PNGアトラス**を格納しています。

- Web用画像: [`assets/icons/tottori-icon-atlas-18.png`](../assets/icons/tottori-icon-atlas-18.png)（288×144px、6列×3行、1セル48×48px、6,555バイト）
- 対応データ: [`assets/icons/icon-pack-18.manifest.json`](../assets/icons/icon-pack-18.manifest.json)
- 個別PNG抽出: [`scripts/export_icon_atlas.py`](../scripts/export_icon_atlas.py)（Pillow使用、48pxの個別画像18枚を出力）
- 別途ChatGPT納品用ZIPには原画と96×96pxの18点、無劣化アトラス、軽量アトラス、一覧プレビュー、manifest、切出し用Pythonコードを収録。**原画のフル解像度ファイルはGitHubにはアップロードしていません**。ZIPをバックアップとして保管してください。

## 18種類の画像対応

| 画像キー | 表示内容 | 代表する施設や自然 |
|---|---|---|
| `torii` | 鳥居 | 神社、神宮、大社 |
| `post` | 郵便局 | 郵便局、簡易郵便局 |
| `cafe` | コーヒーカップ | カフェ、喫茶、珈琲、OpenPOI `cafe` |
| `restaurant` | 皿とカトラリー | 一般飲食店、レストラン、居酒屋 |
| `bakery` | パン | パン屋、OpenPOI `bakery` |
| `sweets` | 団子 | 和菓子、甘味処 |
| `seafood` | 魚 | 海鮮、魚介、寿司、カニ |
| `monument` | 石碑 | 文学碑、句碑、歌碑、記念碑 |
| `old_house` | 伝統家屋 | 生家、旧宅、古民家 |
| `museum` | 博物館 | 博物館、資料館、記念館 |
| `ruins` | 石垣 | 遺跡、廃寺跡、台場跡 |
| `kofun` | 古墳 | 古墳、墳丘 |
| `dunes` | 砂丘 | 鳥取砂丘など |
| `coast` | 海岸 | 海岸、海水浴場 |
| `waterfall` | 滝 | 滝、瀑布 |
| `onsen` | 温泉 | 温泉、足湯、共同浴場 |
| `station` | 駅舎 | 鉄道駅 |
| `information` | 案内標識 | 観光案内所、ビジターセンター |

既存の `scroll/quill/bust/castle/book/temple/tree/building/food` などの画像も継続利用し、**`food` はラーメン屋専用**になりました。絵柄からジャンルを判定するのではなく、`type`（文字ジャンル）とは独立した `iconKind(p)` が、提供元の構造化 `category` を優先しながら施設名で補完します。キュレーション済みの `p.iconKind` が指定されていれば、その画像を優先します。

### 鳥居・郵便局の切り出し品質
この2点は、96pxの個別PNG画像で四辺の透明余白が**それぞれ最低14px**あるように切り出しました。その他の16点も安全余白を取り、元シートの隣接画像が混入していないことをプレビューで目視しました。元の見た目を保つ `NEAREST` リサイズと、Web用PNGの64色パレット最適化を行っています。

### 分類の安全性
「円通寺簡易郵便局」を寺院にしないため、郵便局の名称判定を神社・寺院より**優先**します。居酒屋やカフェの画像を変えても `type='food'` を変更しません。寺社・史跡・文学等の選択タブにも影響せず、**Leafletと地理院地図の描画・GPS・記録データにも変更を加えません**。

## 実装と維持

- CSSの `.pixel-art.v2` が新規アトラスを参照し、各画像の `background-position` はmanifestの `grid` と対応。旧画像は旧アトラスを継続使用。
- 48pxのPNGへ再切り出したい場合は、Webアプリ実行時でなく開発時に `python scripts/export_icon_atlas.py` を実行。
- 単独ファイルでSVG化・再描画するのではなく、切り出した承認済みのピクセル画像を使用。
- iPhone実機の見え方は公開後に検収。新規アイコンの認識率や画面幅は未検証。
