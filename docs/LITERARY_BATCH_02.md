# APP-025 文学・偉人データ 第2回改善（2026-10-25）

## 変更概要

- 「偉人」タブでは、文学にも分類される地点を含めて地図ピンを**黄色**にする。「文学」タブでは**紫色**、「すべて」では主分類色。選択地点の強調ピンも同じ色。
- 現在地のGPSマーカーは、種別の色付き丸印と誤認しないよう**水色のひし形と白い中心点**へ変更。GPS座標の取得・保存は不変。
- 旅帖に**ジャンル絞り込み**を追加。「すべて／名所／史跡／文学／偉人／飲食／風俗／施設」。二重分類の地点は両方に表示する。
- 表示件数と統計は絞り込みに追従し、旅帖のJSONバックアップは常に**全件**を保持。画像/PDF出力は表示中の絞り込みに沿う。
- これらの変更はLeafletの標準 `L.tileLayer()`、地理院 `pale` タイル、自サイト配信Leaflet CSSを変更しない。

## 公開施設座標の照合

前回の [初回42地点データ](LITERARY_BATCH_01.md) を再利用した。既存42件のうち個別公開地図の施設位置を照合した6件を地図表示対象へ昇格し、さらに新しい4件（うち2件座標付き）を登録した。

| 位置照合済み地点 | 公式・施設側の根拠 | 公開地図の地点 |
|---|---|---|
| 米子市立図書館（生田春月文庫） | https://www.yonago-toshokan.jp/guide/access | https://mapfan.com/spots/SC3AC%2CJ%2C800 |
| 倉吉博物館（前田寛治・菅楯彦） | https://www.city.kurayoshi.lg.jp/kurahaku/ | https://www.navitime.co.jp/poi?spot=00004-31168800006 |
| 西河克己映画記念館 | https://chizukankou-kurashiya.jp/highlight/places/eigakinenkan/ | https://www.navitime.co.jp/poi?spot=02301-pn0001899 |
| わらべ館（岡野貞一・田村虎蔵） | https://www.city.tottori.lg.jp/page/3112.html | https://travelscale.jp/spot/warabekan/ |
| 日南町美術館 | https://www.nichinan-culture.jp/ | https://mapcarta.com/N1423068164 |
| 植田正治写真美術館 | https://www.houki-town.jp/ueda/information/ | https://www.navitime.co.jp/poi?spot=02301-2700511 |
| たくみ割烹店（吉田璋也） | https://www.tottori-mingei.jp/takumikappou.html | https://www.navitime.co.jp/poi?spot=02301-pn0000801 |
| 鳥取たくみ工芸店（吉田璋也） | https://www.tottori-mingei.jp/about.html | https://www.navitime.co.jp/poi?spot=02301-2700587 |

追加4件：鳥取民藝美術館、たくみ割烹店、鳥取たくみ工芸店、皆生海浜公園の生田春月文学碑「相寄る魂」。最後の文学碑の存在は [米子市・野外彫刻作品一覧](https://www.city.yonago.lg.jp/11460.htm)を参照したが、ピンに利用できる碑の個別座標が未確定のため参考地点としている。

### 件数と注意事項

- 今回の追加データファイル `literary-batch-01.js`：**46件（座標あり8件・参考38件）**。
- これは追加データの件数。先に登録された `GUIDES`・`CULTURE_SPOTS`・`HOSAI_MONUMENTS` を含む全アプリの件数ではない。
- 公開地図の座標は施設の代表点であり、入口・碑への立ち入りが可能という意味ではない。GPS実地精度は未確認。
- `referenceArea` は**一覧の地域表示だけ**に使い、地図ピン・GPS近接判定には絶対に使わない。
- 後から座標が確定しても `lit01:` / `lit02:` のIDは固定。保存済み訪問記録を切り離さない。

## 受入基準

1. 「偉人」で人物兼文学ピンが黄色、「文学」では紫色。「すべて」では主分類色。
2. 現在地の青いひし形はカテゴリの丸印と区別できる。
3. 旅帖の文学/偉人絞り込みは両属性を拾い、全件バックアップを減らさない。
4. 46件の追加データのうち、確認済み8件だけが地図ピン/近接判定対象。
5. 動作確認済み地図タイル基盤には変更を加えない。

現在はGitHub上のソースコードと模擬動作の確認が対象。iPhone実機での新UIの確認が残る。
