# 出典とライセンス

## OpenPOI API

出典：[OpenPOI API](https://docs.openpoiapi.com/)／[出典・ライセンス一覧](https://openpoiapi.com/attribution.html)

OpenPOI API は Overture Maps、Foursquare OS Places、Japan Food Facilities、国土数値情報などの施設データを統合する。結果の `licenses` と `attributions` をそのまま記録に保持する。提供元により条件が異なるため、第三者への配布や再利用時は各ライセンスを確認する。

- Overture Maps: CDLA-Permissive-2.0 ほか
- Foursquare OS Places: Apache License 2.0。原文のFoursquare NOTICEはこのRepoの[NOTICE.txt](../NOTICE.txt)に掲載
- Japan Food Facilities: CC BY系と公共データ利用規約等の混在
- 国土数値情報: CC BY 4.0

## 文学スポット補完

- 出典：[鳥取市「尾崎放哉句碑の建立場所」](https://odp-pref-tottori.tori-info.co.jp/dataset/1641.html)、CC BY。
- 鳥取市オープンデータから興禅寺と城下町とっとり交流館の句碑位置2件を抽出し、近傍検索用データに整形した。個別の `attributions` を保持。
- 利用者が閲覧する画面、共有ポスター、バックアップでは元の出典にたどれる表記を維持する。API経由データの施設位置・営業状態は未保証。

このPoCによる並び替え・カテゴリ割当・距離算出・スタイル制作は鳥取旅帖による加工。
