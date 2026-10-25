# APP-025 HANDOFF_READY｜鳥取旅帖 検索・位置精度・すれ違い判定

- 作成日：2026-10-25 JST
- APP-ID：APP-025
- work_id：未確認（新セッションでは既存登録の有無を確認し、勝手に新規採番しない）
- 状態：HANDOFF_READY / 実装・main統合・Pages成功 / iPhone Safari実機未検収
- 正本： https://github.com/moyashimisosoup/tottori-trip （Public）
- 公開版： https://moyashimisosoup.github.io/tottori-trip/
- チェックポイントHEAD（本記録作成直前）：`227503905008e0f16a3a1799270e6d78e9648c94`（main）
- 現在のブランチ：`main`。チェック時のOpen PR：0。
- Latest main integration：PR #19 https://github.com/moyashimisosoup/tottori-trip/pull/19 （merged）
- Latest successful Pages：Actions #40159743567 https://github.com/moyashimisosoup/tottori-trip/actions/runs/40159743567 （completed/success、head `2275039`）
- 開始時は必ず最新HEAD・PR・Actionsを再照合する。本記録の追加だけでHEADが変わることがある。

## 目的と直近のユーザー意図

1. 「鳥取駅」と入力したら、駅の代表座標が地図の中心に来てほしい。
2. 地点未登録の施設名、駅、地名、住所でも所在地を検索し、対応地点を地図に表示したい。
3. 検索した地点も「みつけた／すれ違い／訪れた」の旅帖に保存できるべきで、OpenPOIや県公式など**出典の違いだけを理由に自動すれ違い対象から除外してはいけない**。
4. ただし**住所文字列がある**ことと**施設固有の正確なGPS座標がある**ことは同じではない。街区・町丁目・市町村の代表点を無条件で施設そのものと認定しない。座標の確度で一律判定する方針を実装済み。
5. 動作確認が済んだ地理院の淡色地図・Leaflet標準タイル機構は変更しない。スマホ操作性と既存データ保全を重視。

## 実施済み・保存済みコード（main / PR #19）

- `app.js`：検索中は県内のキュレーション済み全エリアから名前検索。OpenPOIによる追加検索は表示中の地図範囲が対象。
- 既存の位置あり地点が1件なら`setView`、複数件なら`fitBounds`。検索を消すと検索前の中心・ズームへ戻る。
- 「鳥取駅」は代表点 `35.49422, 134.226085`へ移動。国土地理院の地名・住所検索（`https://msearch.gsi.go.jp/address-search/AddressSearch?q=...`）を検索確定時だけ利用し、GeoJSONの経度・緯度を取得する。
- 通常の検索対象に座標がなく、番地・丁目を含む具体的な住所があるときは、その住所による地名検索を1回だけ追加する。県外候補や検索語不一致は採用しない。
- 新たな地点は黄金色の検索ピンを表示。検索カード／ピンから通常の詳細を開いた場合だけ「みつけた」を記録できる。検索文字入力だけでは旅帖に自動保存しない。
- `canAutoDetect(p)` は `p.verified === true` かつ有効な数値の`lat/lng`を要求。位置情報監視中でGPS誤差が80m以下、地点まで160m以内ならすれ違いを記録し、重複記録を防ぐ。
- データの提供元は判定基準にしない。正しい施設代表点を確認できた駅・史跡・公式観光施設・OpenPOIスポットなどは同一条件で判定。
- 国土地理院の概略住所代表点は初期`verified:false`。利用者が詳細の「この位置を確認・自動判定に使う」で`verified:true`へ昇格させれば、元のID・訪問日時を保持したまますれ違い対象になる。
- 旅帖保存済みの検索地点・精度フラグを`allPlaces()`と`checkNear()`へ統合し、再検索・画面切替後も対象を保持。
- 初期地図の鳥取中心はGPS現在地ではない。県外GPSでは鳥取の地図に偽の現在地マーカーを作らない。

## 直近までのアプリ成果と保護条件

- PR #9で解消したiPhone Leafletタイル欠けは**実機解消確認済み**。以後、標準`L.tileLayer`・GSI `pale`・自サイト配信Leaflet CSSを維持。
- ジャンル：名所・史跡・寺社・文学・偉人・飲食・施設等。以前の風俗カテゴリは削除済み、既存旅帖記録は保護。
- 文学・偉人：`literary-batch-01.js`。寺社・史跡・名所：`official-landmarks.js`。どちらも未確認地点に推測の座標を補わない。
- 18種ドット絵アイコン`assets/icons/tottori-icon-atlas-18.png`と`assets/icons/icon-pack-18.manifest.json`をGitHub保存。SVGから画像へ切替済み。カフェ/ラーメン/郵便/鳥居等を描き分け。
- 旅帖：「みつけた／すれ違い／訪れた」の3枠はタップ絞込・再タップ解除、ジャンルとAND絞込。JSONバックアップはフィルタと無関係に全件保持。
- 地図タイル基盤、localStorageの記録形式、GPSの追跡機構は小修正のために再構築しない。
- ドキュメント：`README.md`、`docs/APP025_SEARCH_MAP_GEOCODE_20261025.md`、`docs/OFFICIAL_CATEGORIES_20261025.md`、`docs/ICON_PACK_18_HANDOFF_20261025.md`。

## 確認済みの根拠と未確認事項

- PR #19 merged。main `2275039` に対するGitHub Pages Actions #40159743567 completed/success。
- PR本文に記録された限定試験：静的9/9、位置精度・旅帖継続・すれ違い9/9、既存公式地点のID/精度保護6/6。公開コードをGitHubから読み戻して`canAutoDetect`、`checkNear`、`confirmPosition`等の存在と処理を確認した。
- **未確認**：iPhone SafariからGSI地名・住所検索APIへの実通信・CORS、検索結果からカード・詳細表示、位置確認ボタン、実機GPSの精度・すれ違い判定、Safariでの画面スクロールと表示。
- 公開済み・コード保存済み・模擬テスト成功と、**iPhone現地動作確認済み**は区別する。
- 住所だけの参考地点を自動で一律`verified:true`にする機能は作っていない。ユーザーの質問「住所があれば全部同列に？」に対する現時点の回答は、**座標品質が同等なら出典を問わず同列、住所だけでは自動判定の位置根拠にならない**、という実装済みの線引き。

## 次の1操作（新セッション）

GitHub最新HEAD/PR/CIを再照合してから、ユーザーのiPhone Safariで**「鳥取駅」検索 → 駅を地図中心に表示 → 黄金の検索ピン/詳細を開く → 旅帖に「みつけた」記録**の一連の操作を1回だけ確認する。次にGSI未登録住所を1件検索して、候補ピン・参考位置・「この位置を確認」操作を確認。通信エラーならAPI/CORS/入力一致の原因を一点に絞って修正。GPS近接の実測は鳥取県内へ移動可能なときだけ別に検証する。

## 保管・公開上の注意

- GitHubはPublic。認証情報、私的なGPS履歴・現在地、ユーザー端末のlocalStorageをコミットしない。
- 作業はWeb/GitHub優先。既存の関連PR・コミット・資料を再利用し、同じUI・アトラス・テスト基盤を作り直さない。
- 確認できた状態変化があれば`moyashimisosoup/session-deck/docs/APP_PORTFOLIO.md`のAPP-025行のみ簡潔に追記。実機未確認を合格扱いしない。
