# とっとりトリップ | TOTTORI TRIP

鳥取で「見つけた」「すれ違った」「訪れた」場所を集める、単体静的WebアプリPoC。8-bit風UIとドット絵の猫。インストール・ビルド・APIキー・DB不要。

## 起動・公開

`index.html`, `styles.css`, `app.js` を同じ場所に置き、HTTPSの静的ホストで公開する。ローカル確認だけなら `python3 -m http.server 8000` で提供し `http://localhost:8000` を開く。iOS等の位置情報は原則HTTPSで提供して初めて動作する。

GitHub Pages: 新規リポジトリに3ファイルと `README.md` をpushし、Settings > Pages > Deploy from a branch > main / root を選ぶ。Pages公開はリポジトリのプライバシー設定とアカウント契約に依存する。PoCを公開すると、ページのコード自体は公開される。記録や現在地はpushしない。

## 使い方

- 表示した地点（詳細を開いた地点）を「見つけた」として記録。
- 位置情報を許可して「すれ違い ON」にすると、アプリを開いている間、位置精度80m以内でOpenPOIの施設中心160m以内になったら「すれ違った」を記録。到着や入店の証明ではない。
- 「訪れた」は必ず手動で記録。参考地点は位置が概算のため自動判定しない。
- 旅帖から画像PNGとブラウザ印刷の「PDFとして保存」を利用。バックアップ/復元JSONも提供。
- 風俗ジャンルは18歳以上の本人確認ボタン後のみ表示。検索元の提供範囲・業態の曖昧さから、実店舗網羅は保証しない。

## 現行の地図表示（2026-10-25）

- iPhoneで地図タイルが1〜2枚しか表示されない問題に対し、[APP-003 マンションポエム](https://github.com/yama-books/mansion-poet)の正常動作実装を参照。
- 地図画像は **国土地理院の `pale` タイル**を標準の `L.tileLayer()` で表示。地図コンテナもマンションポエムの `position:absolute; inset:0` に合わせた。
- 従来の「地図レイヤー自動切替」「カスタムGridLayerでタイルを再生成」は廃止。初期化はページ読み込み完了時。エラーは状況表示のみ、手動「地図切替」「再読込」で対応する。
- 一覧で施設を開いた後の「地図で見る」「Googleマップ」や、旅帖・位置情報・OpenPOI検索の機能は維持。
- 検証済み：同一の地理院URL・Leaflet設定・CSS地図位置、JavaScript構文、最小スモーク。**iPhone実機で地図が完全に描画されるかは未検証**。

文学・人物スポットは鳥取市オープンデータの尾崎放哉句碑6件を公式緯度経度で登録（CC BY）。文学・偉人の両フィルタで表示し、精度条件を満たすGPS近傍判定の対象。座標未確定の生誕地などは参考地点のまま保持し、自動判定には使わない。

## 技術的留意点

- OpenPOI API: `https://api.openpoiapi.com/v1/search`, `center=lng,lat`, `radius=6000`, `limit=200`。認証不要、CORS許可。最大200件のため密集地の網羅は不可。検索は明示操作中心、移動中は300m/1分以上変化時に限定。
- 地図: Leaflet 1.9.4 + [地理院淡色地図（pale）](https://maps.gsi.go.jp/help/use.html)。初期タイルは標準Leafletの `L.tileLayer()` を使用。手動切替時のみOpenStreetMapタイルに変更。地図画像の提供者と施設データのOpenPOI APIは別。大量取得やバックグラウンド取得は行わない。
- 記録: `localStorage`。同期なし、端末間共有なし、ブラウザのデータ消去で消える。保存するのは施設の名称・座標・日時であり、GPSの生の移動履歴は保存しない。ただし近接した施設の履歴から行動が推測され得るためJSONや画像の公開には注意。
- 文化地点の補助データは、県の観光・文化資料から名称と概略の場所を選んだ参考リスト。ピン座標は概略。正確な入口や史跡中心を示すものではない。
- 掲載施設の閉業・座標のずれ・収録漏れ・カテゴリ分類誤差はあり得る。飲食や風俗の表示は営業状況や許認可を保証しない。
- 無断で写真や文章をコピーせず、リンクと必要最低限の要約のみ収録。

## 出典・ライセンス

OpenPOI API: https://openpoiapi.com/attribution.html

- Overture Maps Foundation, overturemaps.org (CDLA-Permissive 2.0 またはCC0)
- Foursquare OS Places (Apache 2.0, OpenPOI APIのNOTICEとライセンス全文参照): https://opensource.foursquare.com/places-notice-txt/
- Japan Food Facilities （各自治体・厚生労働省のオープンデータを加工して作成）: https://gl20percentclub.github.io/japan-food-facilities/attribution.html
- 国土数値情報（鉄道データ）、国土交通省および e-Stat（駅の住所等に使用）
- 地図 © OpenStreetMap contributors: https://www.openstreetmap.org/copyright
- 県公式観光情報: https://www.tottori-guide.jp/
- 鳥取県文学探訪: https://www.pref.tottori.lg.jp/tottori_bungaku_tanbo_map/
- 尾崎放哉ゆかりの地: https://www.pref.tottori.lg.jp/dd.aspx?menuid=73376

本アプリ自体のPoCソースコードはMIT Licenseとして利用可（外部データのライセンスは各出典に従う）。

## 受入チェック（過剰な自動検査はしない）

1. HTTPSで開いて地図と鳥取市の参考地点が表示される。
2. 実APIを1回検索し、OpenPOIの施設名と距離が表示される。
3. 一つ開いて「見つけた」になり、「訪れた」を押すと旅帖に残る。
4. 位置情報の許可/拒否に応じてステータスが変わる。
5. 旅帖の画像出力・PDF保存とJSONバックアップ/復元ができる。

## 次の範囲（PoC外）

正確な文化史跡ピンの出典検証と個別地点リンク、端末間同期、バックグラウンド位置監視、クラウド保存、写真アルバム、公開ランキング、サーバー側POIキャッシュは対象外。