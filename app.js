/* とっとりトリップ: static, no build process; geolocation/diary data remain in the browser. */
'use strict';
const API='https://api.openpoiapi.com/v1/search';
const KEY='tottori-trip-v1';
const UI_KEY='tottori-trip-ui-v1';
const LOCATION_CACHE_KEY='tottori-trip-address-cache-v1';
// Addresses and known coordinates for all 106 static registered spots.
// Dynamic OpenPOI results are kept separate and use their source coordinates.
const ADDRESS_CATALOG=new Map((window.TOTTORI_LOCATION_CATALOG?.entries||[]).map(p=>[p.id,p]));
const LITERARY_SEEDS=new Map((window.TOTTORI_LITERARY_LOCATION_SEEDS_06?.entries||[]).map(p=>[p.id,p]));
function readLocationCache(){
 try{
  const x=JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY)||'{}');
  return x&&typeof x==='object'&&!Array.isArray(x)?x:{}
 }catch{return {}}
}
const addressCache=readLocationCache(),addressRequests=new Map(),addressAttempted=new Set();
let addressEnrichmentActive=false,addressNetworkUnavailable=false;
function addressQueryText(address){
 // The descriptive tail identifies a group of monuments, not a postal address.
 const text=String(address||'').replace(/^鳥取県/,'').split(/[・（(]/)[0].trim();
 if(!text||/(?:市内|町内)$/.test(text)||
  /^(?:鳥取県|鳥取市|米子市|倉吉市|境港市|岩美町|三朝町|若桜町|日南町|日野町|大山町|北栄町)$/.test(text))return '';
 return text
}
function withCatalog(p){
 const info=ADDRESS_CATALOG.get(p.id);
 const address=p.address||info?.address||'';
 if(Number.isFinite(p.lat)&&Number.isFinite(p.lng))
  return p.address?p:{...p,address};
 // Preloaded public-area positions make literary pins available without
 // waiting for a network request or tapping a card. They are NOT GPS sites.
 const ref=(p.type==='literature'||p.relatedTypes?.includes('literature'))&&p.referenceArea;
 if(Number.isFinite(ref?.lat)&&Number.isFinite(ref?.lng))
  return {...p,address,lat:ref.lat,lng:ref.lng,verified:false,
   locationSource:'literary-reference',locationPrecision:'broad'};
 // API-resolved addresses may be more specific than the stored area seed.
 const key=addressQueryText(address),cached=key&&addressCache[key];
 if(cached&&Number.isFinite(cached.lat)&&Number.isFinite(cached.lng))
  return {...p,address,lat:cached.lat,lng:cached.lng,verified:false,
   locationSource:'address-catalog',locationPrecision:info?.approximate?'broad':'address'};
 const seed=LITERARY_SEEDS.get(p.id);
 if(seed&&Number.isFinite(seed.lat)&&Number.isFinite(seed.lng))
  return {...p,address,lat:seed.lat,lng:seed.lng,verified:false,
   locationSource:'literary-reference',locationPrecision:'broad',
   referenceLabel:seed.label,referenceSourceUrl:seed.sourceUrl};
 return info&&!p.address?{...p,address}:p
}
async function resolveRegisteredAddress(place,{retry=false}={}){
 const entry=ADDRESS_CATALOG.get(place.id);
 if(!entry)return null;
 const address=place.address||entry.address,query=addressQueryText(address);
 if(!query)return null;
 if(retry){addressAttempted.delete(query);addressNetworkUnavailable=false}
 if(addressCache[query])return withCatalog(place);
 if(addressAttempted.has(query))return null;
 if(addressRequests.has(query))return addressRequests.get(query);
 const task=(async()=>{
  addressAttempted.add(query);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   let hit=null;
   for(const term of new Set([query,query.replace(/[0-9０-９]+(?:[-－][0-9０-９]+)?(?:番地?|号)?$/,'').trim()])){
    if(!term)continue;
    const response=await fetch(GEO_SEARCH_URL+'?q='+encodeURIComponent(term),{signal:controller.signal});
    if(!response.ok)throw new Error('GSI '+response.status);
    hit=parseGsiCandidates(await response.json(),term)[0];
    if(hit)break;
   }
   if(!hit)return null;
   addressCache[query]={lat:hit.lat,lng:hit.lng,title:hit.title};
   try{localStorage.setItem(LOCATION_CACHE_KEY,JSON.stringify(addressCache))}catch{}
   // Map data refresh is independent of the journal and preserves its IDs.
   state.places=allPlaces();
   renderList();
   if(state.tracking)checkNear();
   return withCatalog(place)
  }catch(err){
   addressNetworkUnavailable=true;
   console.warn('Registered address geocode unavailable',query,err);
   return null
  }finally{clearTimeout(timeout);addressRequests.delete(query)}
 })();
 addressRequests.set(query,task);
 return task
}
async function enrichRegisteredLocations(){
 if(addressEnrichmentActive)return;
 addressEnrichmentActive=true;
 const areaAtStart=state.area;
 try{
  // Prioritize address lookups for literary heritage. They are the main
  // visitor-facing dataset and need map pins sooner than generic venues.
  const pending=currentGuides().sort((a,b)=>
   Number(b.id?.startsWith('lit04:'))-Number(a.id?.startsWith('lit04:')));
  for(const place of pending){
   if(areaAtStart!==state.area||addressNetworkUnavailable)break;
   // Seed pins are usable immediately. Keep refining their positions
   // in the background with the registered address when GSI is available.
   if(Number.isFinite(place.lat)&&Number.isFinite(place.lng)&&
      !(place.locationSource==='literary-reference'&&LITERARY_SEEDS.has(place.id)))continue;
   const address=ADDRESS_CATALOG.get(place.id)?.address;
   const query=addressQueryText(address);
   if(!query||addressAttempted.has(query))continue;
   await resolveRegisteredAddress(place);
   await new Promise(resolve=>setTimeout(resolve,700)); // gentle, serial API reads
  }
 }finally{
  addressEnrichmentActive=false;
  if(areaAtStart!==state.area&&!addressNetworkUnavailable)
   setTimeout(()=>void enrichRegisteredLocations(),0)
 }
}
function loadPreferences(){
 const defaults={showOther:false,tone:3};
 try{
  const saved=JSON.parse(localStorage.getItem(UI_KEY)||'{}');
  return {showOther:saved?.showOther===true,
   tone:Number.isInteger(saved?.tone)&&saved.tone>=1&&saved.tone<=5?saved.tone:defaults.tone}
 }catch{return defaults}
}
function generalFacility(p){
 const n=String(p.name||''),cat=String(p.category||'').toLowerCase();
 // Excluded by default, not deleted. Explicit search and saved journal remain usable.
 return /病院|医院|クリニック|診療所|歯科|介護|福祉|老人ホーム|デイサービス|支援センター|保健所|工場|製作所|製造所|物流センター|倉庫|研究所|事業所|株式会社|有限会社|合同会社|本社|営業所|オフィス|事務所/.test(n)||
  /^(hospital|clinic|doctor|dentist|healthcare|social_facility|nursing_home|office|company|factory|industrial|warehouse|manufacturing)$/.test(cat)
}
function touristSpot(p){
 if(generalFacility(p))return false;
 // Travel-friendly restaurants, local shops and stations belong in the default map.
 return ['sight','history','temple','literature','people','food','shop','cafe','lodging'].includes(effectiveType(p))||
  /駅$|観光案内所|ビジターセンター/.test(String(p.name||''))
}
const TOTTORI_STATION_ID='search:railway:tottori';
const TOTTORI_STATION_POINT={lat:35.49422,lng:134.226085};
const AREAS={
 tottori:{name:'鳥取市',lat:35.5011,lng:134.2351},
 kurayoshi:{name:'倉吉',lat:35.4307,lng:133.8255},
 yonago:{name:'米子',lat:35.4281,lng:133.3309},
 sakaiminato:{name:'境港',lat:35.5432,lng:133.2311}
};
// Reference points are guide-level approximate coordinates; never auto-award a near-miss for them.
// Locations without reliable map pins deliberately have no coordinates.
const GUIDES=[
 {name:'鳥取砂丘',type:'sight',lat:35.5407,lng:134.2313,area:'tottori',note:'砂の丘が連なる鳥取を代表する風景。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'白兎神社',type:'temple',lat:35.5231,lng:134.1149,area:'tottori',note:'因幡の白うさぎの神話にゆかりのある神社。',url:'https://www.torican.jp/en/spot/detail_1003.html',verified:false},
 {name:'鳥取城跡',type:'history',lat:35.5117,lng:134.2406,area:'tottori',note:'久松山の麓に残る鳥取城の史跡。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'仁風閣',type:'history',lat:35.5103,lng:134.2387,area:'tottori',note:'鳥取城跡の近くにある洋風建築。',url:'https://www.pref.tottori.lg.jp/260655.htm',verified:false},
 {name:'尾崎放哉の句碑',type:'literature',lat:null,lng:null,area:'tottori',address:'鳥取市立川町1丁目',note:'自由律俳句の俳人、尾崎放哉の句碑。',url:'https://www.pref.tottori.lg.jp/dd.aspx?menuid=73376',verified:false},
 {name:'尾崎放哉生誕の地',type:'people',lat:null,lng:null,area:'tottori',address:'鳥取市吉方町2丁目',note:'鳥取出身の俳人、尾崎放哉の生誕地。',url:'https://www.pref.tottori.lg.jp/dd.aspx?menuid=73376',verified:false},
 {name:'倉吉白壁土蔵群',type:'sight',lat:35.4333,lng:133.8249,area:'kurayoshi',note:'白壁の土蔵が並ぶ歴史的な町並み。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'三朝温泉',type:'sight',lat:35.4083,lng:133.8941,area:'kurayoshi',note:'三徳川沿いに広がる温泉街。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'青山剛昌ふるさと館',type:'people',lat:35.4980281,lng:133.7618124,area:'kurayoshi',note:'漫画家・青山剛昌の記念館。2027年の移転計画あり。',url:'https://www.gamf.jp/42.html',verified:true,relatedTypes:['literature']},
 {name:'水木しげるロード',type:'people',lat:35.5460663,lng:133.2268863,area:'sakaiminato',note:'妖怪像が並ぶ水木しげるゆかりの通り。地点は通りの代表位置。',url:'https://mapfan.com/spots/SCYH3%2CJ%2CV0',verified:false,relatedTypes:['literature']},
 {name:'水木しげる記念館',type:'people',lat:35.546317,lng:133.23117,area:'sakaiminato',note:'漫画家・水木しげるを紹介する記念館。',url:'https://www.navitime.co.jp/poi?spot=02301-2700043',verified:true,relatedTypes:['literature']},
 {name:'大山',type:'sight',lat:35.3710,lng:133.5465,area:'yonago',note:'伯耆富士とも呼ばれる鳥取の名峰。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'皆生温泉',type:'sight',lat:35.4574,lng:133.3628,area:'yonago',note:'日本海に面した温泉地。',url:'https://www.tottori-guide.jp/',verified:false}
].map((p,i)=>({...p,id:'guide:'+i,source:p.verified?'curated':'guide',licenses:[],attributions:p.verified?['施設公開情報・地点照合']:[],category:p.type}));

// Verified positions published by Tottori City (CC BY). Each marker is an individual
// monument, not a guessed home address or an estimated birthplace.
const HOSAI_DATASET='https://odp-pref-tottori.tori-info.co.jp/dataset/1641.html';
const HOSAI_MONUMENTS=[
 {name:'尾崎放哉句碑（興禅寺）',lat:35.50398519444445,lng:134.24124519444445,address:'鳥取市栗谷町10',note:'興禅寺に建立された尾崎放哉の句碑。'},
 {name:'尾崎放哉句碑（城下町とっとり交流館前）',lat:35.498931722222224,lng:134.23692080555554,address:'鳥取市元大工町1',note:'城下町とっとり交流館の前に建立された句碑。'},
 {name:'尾崎放哉句碑（城下町とっとり交流館庭・焼芋）',lat:35.49908436111111,lng:134.23695369444445,address:'鳥取市元大工町1',note:'交流館の庭に建立された句碑。'},
 {name:'尾崎放哉句碑（城下町とっとり交流館庭・春の雪）',lat:35.49902772222222,lng:134.23709861111112,address:'鳥取市元大工町1',note:'交流館の庭に建立された句碑。'},
 {name:'尾崎放哉句碑（城下町とっとり交流館庭・海）',lat:35.49903477777778,lng:134.2370066388889,address:'鳥取市元大工町1',note:'交流館の庭に建立された句碑。'},
 {name:'尾崎放哉句碑（修立小学校校門前）',lat:35.48887613888889,lng:134.24248733333334,address:'鳥取市立川町5丁目339',note:'修立小学校の校門前に建立された句碑。'}
].map((p,i)=>({...p,id:'hosai:'+i,type:'literature',relatedTypes:['people'],area:'tottori',category:'literature',source:'tottori-city-poi',verified:true,licenses:['CC BY'],attributions:['鳥取市「尾崎放哉句碑の建立場所」'],url:HOSAI_DATASET}));


const CULTURE_SPOTS=[
 {name:'鳥取県立図書館（ふるさと文学コーナー）',lat:35.50237301,lng:134.23750605,address:'鳥取市尚徳町101',area:'tottori',type:'literature',note:'尾崎放哉・尾崎翠・生田春月など郷土文学の関連資料を紹介。',url:'https://www.library.pref.tottori.jp/information/post.html',source:'tottori-pref-library'},
 {name:'大伴家持歌碑',lat:35.474227,lng:134.272054,address:'鳥取市国府町庁198',area:'tottori',type:'literature',relatedTypes:['people'],note:'因幡国守を務めた万葉歌人、大伴家持の歌碑。',url:'https://www.cgr.mlit.go.jp/tottori/tono/html/kankou.html',source:'mlit'},
 {name:'因幡万葉歴史館',lat:35.472792,lng:134.274692,address:'鳥取市国府町町屋726',area:'tottori',type:'literature',relatedTypes:['people'],note:'大伴家持や因幡の万葉文化に出会える施設。',url:'https://www.cgr.mlit.go.jp/tottori/tono/html/kankou.html',source:'mlit'},
 {name:'用瀬文学の小径（案内地点）',lat:35.3427526,lng:134.2074526,address:'鳥取市用瀬町用瀬',area:'tottori',type:'literature',relatedTypes:['people'],note:'句碑・歌碑をたどる散歩道。地図の地点は総合支所の代表位置で碑の正確な座標ではありません。',url:'https://www.city.tottori.lg.jp/site/komichi/',source:'reference',verified:false},
 {name:'鳥取市立中央図書館',lat:35.491507959846835,lng:134.22702119387404,address:'鳥取市富安二丁目138-4',area:'tottori',type:'literature',note:'鳥取市立の中央図書館。',url:'https://odp-pref-tottori.tori-info.co.jp/dataset/1636/url_resource/29/content.html',source:'tottori-open-data'},
 {name:'用瀬図書館',lat:35.3400540935308,lng:134.20394908869554,address:'鳥取市用瀬町用瀬104-2',area:'tottori',type:'literature',note:'文学の小径がある用瀬町の図書館。',url:'https://odp-pref-tottori.tori-info.co.jp/dataset/1636/url_resource/29/content.html',source:'tottori-open-data'},
 {name:'鳥取市歴史博物館（やまびこ館）',lat:35.49898,lng:134.243974,address:'鳥取市上町88',area:'tottori',type:'history',note:'鳥取の歴史と郷土文化を知る博物館。',url:'https://odp-pref-tottori.tori-info.co.jp/dataset/1636/url_resource/22/content.html',source:'tottori-open-data'},
 {name:'尾崎翠資料館 ゆかむりギャラリー',lat:null,lng:null,address:'岩美郡岩美町岩井546',area:'tottori',type:'literature',relatedTypes:['people'],note:'作家・尾崎翠の資料館。公開住所のみ確認済み。',url:'https://www.torican.jp/spot/detail_1447.html',source:'reference',verified:false},
 {name:'谷口ジロー『父の暦』ゆかりの鳥取',lat:null,lng:null,address:'鳥取市内（作品の舞台）',area:'tottori',type:'literature',relatedTypes:['people'],note:'鳥取市が舞台の作品。固定の訪問地点を指定できないため参考情報。',url:'https://www.pref.tottori.lg.jp/291428.htm',source:'reference',verified:false}
].map((p,i)=>({...p,id:'culture:'+i,verified:p.verified!==false,category:p.type,licenses:[],attributions:[p.url]}));
const $=id=>document.getElementById(id);
const TYPES={sight:['✦','名所'],history:['▥','史跡'],temple:['社','寺社'],literature:['本','文学'],people:['★','偉人'],food:['食','飲食'],shop:['店','買物'],cafe:['☕','カフェ'],lodging:['宿','宿泊'],other:['・','施設']};
const q=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initial=()=>{
 try{
  const obj=JSON.parse(localStorage.getItem(KEY)||'{}');
  if(!obj||typeof obj!=='object'||Array.isArray(obj))return {};
  // Repair earlier misclassified post offices without changing saved visit times.
  for(const row of Object.values(obj)){
   if(row?.place?.type==='history'&&/郵便局|郵便ポスト/.test(row.place.name||''))row.place.type='other';
   if(row?.place?.type==='history'&&classify({...row.place,type:null})==='temple')row.place.type='temple';
  }
  return obj
 }catch{return {}}
};
const state={area:'tottori',center:AREAS.tottori,workShowAll:false,filter:'all',query:'',places:[],results:[],journal:initial(),tab:'places',journalFilter:'all',journalStatus:'all',selected:null,map:null,markers:null,gps:null,watch:null,tracking:false,lastFetch:0,lastLoc:null,toastTimer:0,loading:false,searchMapActive:false,searchOriginalView:null,geocodeResult:null,prefs:loadPreferences()};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state.journal))}catch{toast('保存できません。空き容量をご確認ください')}}
function idOf(p){return p.id||'poi:'+([p.source||'',p.name||'',Number(p.lat).toFixed(5),Number(p.lng).toFixed(5)].join('|'))}
// Group the exact station name near its representative point. Similar names
// such as 鳥取駅南口観光バス乗り場 must remain separate places.
function sameTottoriStation(p){
 return p&&normalizedSearch(p.name)==='鳥取駅'&&
  Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
  meters(p,TOTTORI_STATION_POINT)<=300
}
function placeKey(p){return sameTottoriStation(p)?TOTTORI_STATION_ID:idOf(p)}
// Keep old localStorage IDs/records intact; combine them only for display,
// counts and proximity checks. JSON backup exports all original entries.
function journalRows(){
 const rows=[];let station=null;
 for(const row of Object.values(state.journal)){
  if(!row?.place)continue;
  if(!sameTottoriStation(row.place)){rows.push(row);continue}
  if(!station){station={...row};rows.push(station);continue}
  for(const field of ['seenAt','nearAt','visitedAt']){
   station[field]=[station[field],row[field]].filter(Boolean).sort()[0]||null
  }
  if(row.place.verified===true&&station.place.verified!==true)
   station.place=row.place
 }
 return rows
}
function journalRecordFor(p){
 return sameTottoriStation(p)?
  journalRows().find(row=>sameTottoriStation(row.place)):
  state.journal[idOf(p)]
}
function normalize(raw){if(!raw||!raw.name)return null;const lat=raw.lat===''||raw.lat==null?null:Number(raw.lat);const lng=raw.lng===''||raw.lng==null?null:Number(raw.lng);if(lat!==null&&(!Number.isFinite(lat)||lat < -90||lat>90))return null;if(lng!==null&&(!Number.isFinite(lng)||lng< -180||lng>180))return null;
 const p={name:String(raw.name).slice(0,130),lat,lng,address:String(raw.address||'').slice(0,180),category:String(raw.category||'unknown'),source:String(raw.source||'openpoi'),attributions:Array.isArray(raw.attributions)?raw.attributions.slice(0,15):[],licenses:Array.isArray(raw.licenses)?raw.licenses.slice(0,15):[],verified:true};p.id=idOf(p);p.type=classify(p);return p}
function isNightlifeName(name){
 return /ソープランド|ファッションヘルス|デリヘル|ホテヘル|ピンクサロン|キャバクラ|ホストクラブ|風俗店|メンズエステ|コンカフェ/.test(String(name||''))
}
function classify(p){
 const n=String(p.name||'');
 if(/たくみ割烹店/.test(n))return 'food';
 if(/たくみ工芸店/.test(n))return 'shop';
 if(p.category==='cafe'||/カフェ|喫茶|珈琲|コーヒー|coffee|café|cafe|スターバックス|ドトール|タリーズ|すなば珈琲/i.test(n))return 'cafe';
 if(['hotel','guest_house','hostel','ryokan','accommodation'].includes(p.category)||/ホテル|旅館|民宿|ゲストハウス|宿泊施設/.test(n))return 'lodging';
 if(p.type)return p.type==='adult'?'other':p.type;
 if(/郵便局|郵便ポスト|〒|ゆうちょ|学校|保育園|幼稚園|交番|駐在所|市役所|役場|公民館/.test(n))return 'other';
 if(isNightlifeName(n))return 'other';
 if(/廃寺跡|寺院跡|旧寺跡/.test(n))return 'history';
 if(/神社|神宮|大社|神祠|観音堂|寺院|寺$|寺（|寺\(|投入堂|岩屋堂|仏閣/.test(n))return 'temple';
 if(/放哉|文学|文芸|歌碑|句碑|詩碑|小説|万葉|図書館/.test(n))return 'literature';
 if(/生誕|記念館|水木しげる|青山剛昌/.test(n))return 'people';
 if(/城跡|古墳|遺跡|史跡|石碑|旧居|文化財|台場跡|国庁跡|墓所|居館跡/.test(n))return 'history';
 if(['restaurant','cafe','fast_food','bakery','bar_izakaya','japanese_restaurant'].includes(p.category)||/割烹|料理店|食堂|レストラン|喫茶|カフェ|パン屋|ベーカリー|寿司店|ラーメン店/.test(n))return 'food';
 if(['shop','retail','gift_shop','souvenir','craft_shop','book_store','bookshop','general_store','convenience_store'].includes(p.category)||/雑貨|土産|みやげ|工芸店|民藝店|民芸店|ギフトショップ|書店|本屋|セレクトショップ/.test(n))return 'shop';
 if(/砂丘|海岸|海水浴場|渓谷|展望|公園|温泉|山岳|庭園|景勝|美術館|博物館|花回廊|街並|土蔵群|宿場町/.test(n))return 'sight';
 return 'other'
}
function effectiveType(p){
 const n=String(p.name||'');
 // Preserve the existing record ID and historic timestamps but correct its genre.
 if(/たくみ割烹店/.test(n))return 'food';
 if(/たくみ工芸店/.test(n))return 'shop';
 if(p.category==='cafe'||/カフェ|喫茶|珈琲|コーヒー|coffee|café|cafe|スターバックス|ドトール|タリーズ|すなば珈琲/i.test(n))return 'cafe';
 if(['hotel','guest_house','hostel','ryokan','accommodation'].includes(p.category)||/ホテル|旅館|民宿|ゲストハウス|宿泊施設/.test(n))return 'lodging';
 const original=p.type==='adult'?'other':(p.type||classify(p));
 if(original==='history'&&classify({...p,type:null})==='temple')return 'temple';
 return original||'other'
}
function rad(n){return n*Math.PI/180}
function meters(a,b){if(!a||!b||a.lat==null||a.lng==null||b.lat==null||b.lng==null)return Infinity;const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),v=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)))}
function prettyDist(p){let n=meters(state.gps||state.center,p);if(!Number.isFinite(n))return '参考地点';return `${p.source==='guide'?'約':''}${n<1000?Math.round(n)+'m':(n/1000).toFixed(1)+'km'}`}
function where(p){return p.address||(p.source==='guide'?(AREAS[p.area]?.name||'鳥取県'):'')}
function toast(s){const el=$('toast');el.textContent=s;el.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.hidden=true,3000)}
function status(s,ok=false){$('gpsStatus').textContent=s;$('gpsDot').classList.toggle('on',ok);$('locateBtn').setAttribute('aria-pressed',String(ok))}
function eventFor(p,kind){
 // Avoid creating another station ID if a journal alias was recorded earlier.
 const id=sameTottoriStation(p)?(journalRecordFor(p)?.id||idOf(p)):idOf(p);
 let row=state.journal[id];
 if(!row){row={id,place:{...p,id},seenAt:null,nearAt:null,visitedAt:null};state.journal[id]=row}
 if(!row[kind+'At'])row[kind+'At']=new Date().toISOString();
 row.place={...p,id,verified:p.verified===true||row.place?.verified===true};
 save();$('journalCount').textContent=journalRows().length;return row
}
function rank(row){return row?.visitedAt?'訪れた':row?.nearAt?'すれ違った':row?.seenAt?'見つけた':''}
function showTab(tab){state.tab=tab;const on=tab==='places';$('placesPane').hidden=!on;$('journalPane').hidden=on;$('placesTab').classList.toggle('active',on);$('journalTab').classList.toggle('active',!on);$('placesTab').setAttribute('aria-pressed',String(on));$('journalTab').setAttribute('aria-pressed',String(!on));if(!on)renderJournal();else renderList();refreshMapSize(90)}
const LITERARY_BATCH_01=Array.isArray(window.TOTTORI_LITERARY_BATCH_01)?window.TOTTORI_LITERARY_BATCH_01:[];
const LITERARY_PLACES_03=Array.isArray(window.TOTTORI_LITERARY_PLACES_03)?window.TOTTORI_LITERARY_PLACES_03:[];
const LITERARY_SITES_04=Array.isArray(window.TOTTORI_LITERARY_SITES_04)?window.TOTTORI_LITERARY_SITES_04:[];
const LITERARY_WORKS_03=Array.isArray(window.TOTTORI_LITERARY_WORKS_03)?window.TOTTORI_LITERARY_WORKS_03:[];
const LITERARY_MAP_05=window.TOTTORI_LITERARY_MAP_05||{links:[],anchors:[]};
const OFFICIAL_LANDMARKS=Array.isArray(window.TOTTORI_OFFICIAL_LANDMARKS)?window.TOTTORI_OFFICIAL_LANDMARKS:[];
function currentGuides(){
 // Text searches cover every registered area, independent of the map viewport.
 // Ordinary browsing still uses the selected area for nearby discovery.
 const searchAll=!!state.query.trim();
 const inArea=p=>searchAll||p.area===state.area;
 return [
  ...GUIDES.filter(inArea),
  ...CULTURE_SPOTS.filter(inArea),
  ...LITERARY_BATCH_01.filter(inArea),
  ...LITERARY_PLACES_03.filter(inArea),
  ...LITERARY_SITES_04.filter(inArea),
  ...OFFICIAL_LANDMARKS.filter(inArea),
  ...(searchAll||state.area==='tottori'?HOSAI_MONUMENTS:[])
 ].map(withCatalog)
}
function allPlaces(){
 const items=new Map();
 const savedSearch=Object.values(state.journal)
  .filter(row=>row?.place&&(
   ['gsi-search','railway-search','address-edit'].includes(row.place.source)||
   (row.place.verified===true&&Number.isFinite(row.place.lat)&&Number.isFinite(row.place.lng))))
  .map(row=>row.place);
 for(const item of [...currentGuides(),...state.results,...savedSearch]){
  if(isNightlifeName(item.name))continue;
  const nextType=effectiveType(item);
  const p=nextType===item.type?item:{...item,type:nextType};
  const key=placeKey(p),prior=items.get(key);
  if(!prior||p.source==='address-edit'||(!state.journal[prior.id]&&!!state.journal[p.id])||
   (p.verified===true&&prior.verified!==true))items.set(key,p)
 }
 return [...items.values()]
}
function normalizedSearch(value){
 return String(value||'').normalize('NFKC').toLocaleLowerCase().trim()
}
// Cafe has its own icon and category, but is also discoverable under Food.
// Keep this rule shared across maps, the journal, statistics and exports.
function belongsToCategory(p,category){
 if(category==='all')return true;
 const primary=effectiveType(p);
 return primary===category||(category==='food'&&primary==='cafe')||
  !!p.relatedTypes?.includes(category)
}
function matches(p){
 if(isNightlifeName(p.name)||!belongsToCategory(p,state.filter))return false;
 const term=normalizedSearch(state.query);
 // Filter only default browsing; manual name search or genre choice still shows
 // all records, including offices and medical facilities if explicitly requested.
 if(!state.prefs.showOther&&!term&&state.filter==='all'&&!touristSpot(p))return false;
 if(term){
  const text=normalizedSearch([p.name,p.address,p.note,p.mapQuery].filter(Boolean).join(' '));
  if(!term.split(/\s+/).every(word=>text.includes(word)))return false
 }
 // Only nearby browsing is restricted by the approximate reference region.
 // A textual search can find the reference by name without inventing a map pin.
 if(p.referenceArea&&!term){
  const c=state.map?.getCenter()||state.center;
  if(meters(c,p.referenceArea)>(p.referenceArea.radius||6000))return false;
 }
 return true
}
function filtered(){
 const bounds=state.map?.getBounds();
 const center=state.map?.getCenter()||state.center;
 const searching=!!state.query.trim();
 const visible=state.places.filter(p=>matches(p)&&
  (searching||p.lat==null||p.lng==null||!bounds?.isValid()||bounds.contains([p.lat,p.lng])));
 if(searching){
  const query=normalizedSearch(state.query);
  const relevance=p=>{
   const name=normalizedSearch(p.name);
   if(name===query)return 0;
   if(name.startsWith(query))return 1;
   if(name.includes(query))return 2;
   if(normalizedSearch(p.address).includes(query))return 3;
   return 4;
  };
  return visible.sort((a,b)=>relevance(a)-relevance(b)||
   Number(b.area===state.area)-Number(a.area===state.area)||
   meters(center,a)-meters(center,b)).slice(0,70)
 }
 const coords=visible.filter(p=>p.lat!=null&&p.lng!=null)
  .sort((a,b)=>meters(center,a)-meters(center,b));
 const references=visible.filter(p=>p.lat==null||p.lng==null)
  .sort((a,b)=>Number(b.source==='official-tourism')-Number(a.source==='official-tourism'));
 // Avoid a dense API result hiding every official, unlocated cultural place.
 return [...coords.slice(0,state.filter==='all'?55:50),
         ...references.slice(0,state.filter==='all'?15:20)]
}
function updateSearchHereButton(){
 const m=state.map,btn=$('searchHereBtn');
 if(!m||!state.lastSearchedCenter){btn.hidden=true;return}
 const pan=meters(m.getCenter(),state.lastSearchedCenter);
 btn.hidden=pan<75&&Math.abs(m.getZoom()-state.lastSearchedZoom)<0.45;
}
function searchVisibleMap(){
 if(!state.map||state.loading)return;
 const c=state.map.getCenter();
 state.center={lat:c.lat,lng:c.lng};
 if(isTottori(state.center)){
  const nearest=Object.keys(AREAS).reduce((a,b)=>meters(state.center,AREAS[b])<meters(state.center,AREAS[a])?b:a);
  state.area=nearest;$('area').value=nearest;
 }
 $('searchHereBtn').hidden=true;
 fetchPlaces(state.query)
}
/** Focus the *actual geocoded search matches*; never invent a position for a reference. */
function focusSearchResults({silent=false}={}){
 if(!state.map||!state.query.trim())return 0;
 const single=state.geocodeResult;
 if(single&&Number.isFinite(single.lat)&&Number.isFinite(single.lng)){
  if(!state.searchOriginalView){
   const center=state.map.getCenter();
   state.searchOriginalView={lat:center.lat,lng:center.lng,zoom:state.map.getZoom()}
  }
  state.searchMapActive=true;
  state.map.setView([single.lat,single.lng],16,{animate:false});
  mapStamp();
  refreshMapSize(80);
  return 1
 }
 const places=filtered().filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
 if(!places.length){
  const books=literaryMapGroups();
  if(books.length){
   if(!state.searchOriginalView){
    const pos=state.map.getCenter();
    state.searchOriginalView={lat:pos.lat,lng:pos.lng,zoom:state.map.getZoom()}
   }
   state.searchMapActive=true;
   const coords=books.map(g=>[g.lat,g.lng]);
   if(coords.length===1)state.map.setView(coords[0],14,{animate:false});
   else state.map.fitBounds(coords,{padding:[36,36],maxZoom:14,animate:false});
   refreshMapSize(80);
   return books.reduce((n,g)=>n+g.works.length,0)
  }
  if(!silent&&filtered().length)toast('座標未確認の候補は一覧に表示しています');
  return 0
 }
 if(!state.searchOriginalView){
  const center=state.map.getCenter();
  state.searchOriginalView={lat:center.lat,lng:center.lng,zoom:state.map.getZoom()}
 }
 state.searchMapActive=true;
 const coords=places.map(p=>[p.lat,p.lng]);
 if(coords.length===1)state.map.setView(coords[0],15,{animate:false});
 else state.map.fitBounds(coords,{padding:[36,36],maxZoom:15,animate:false});
 mapStamp();
 refreshMapSize(80);
 return coords.length
}
// GSI place-name and address lookup. User-submit only: never auto-geocode keystrokes.
// We intentionally do not use OSMF's public Nominatim as a generic app geocoder.
function addressMatchText(value){
 // A locality can be written as 二丁目 or 2丁目; preserve place-name kanji.
 const digits={一:'1',二:'2',三:'3',四:'4',五:'5',六:'6',七:'7',八:'8',九:'9',十:'10'};
 return normalizedSearch(value).replace(/^鳥取県/,'')
  .replace(/[一二三四五六七八九十](?=丁目)/g,ch=>digits[ch]);
}
function parseGsiCandidates(features,keyword){
 if(!Array.isArray(features))return [];
 const needle=addressMatchText(keyword);
 return features.map(row=>{
  const coords=row?.geometry?.coordinates,title=String(row?.properties?.title||'');
  const lng=Number(coords?.[0]),lat=Number(coords?.[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!isTottori({lat,lng}))return null;
  const label=addressMatchText(title);
  if(!label||!(label.includes(needle)||needle.includes(label)))return null;
  const rank=label===needle?0:label.startsWith(needle)?1:label.includes(needle)?2:3;
  return {lat,lng,title,rank,source:'gsi',query:keyword}
 }).filter(Boolean).sort((a,b)=>a.rank-b.rank).slice(0,5)
}
function knownPlaceSearch(keyword){
 const value=normalizedSearch(keyword).replace(/^jr/,'');
 if(value==='鳥取駅')return {
  lat:35.49422,lng:134.226085,title:'鳥取駅',
  source:'railway',query:keyword,
  sourceUrl:'https://postcode.teraren.com/stations/3895'
 };
 return null
}
function geoPlace(p){
 const base=p.basePlace||null;
 const name=base?.name||p.title||p.query||'検索した地点';
 const lat=Number(p.lat),lng=Number(p.lng);
 const station=p.source==='railway';
 const id=base?.id||(station&&normalizedSearch(name)==='鳥取駅'?
  'search:railway:tottori':
  'search:gsi:'+normalizedSearch(name)+':'+lat.toFixed(5)+','+lng.toFixed(5));
 // Never downgrade a user-confirmed location when revisiting a search.
 const existing=state.journal[id]?.place;
 if(existing?.verified===true&&Number.isFinite(existing.lat)&&Number.isFinite(existing.lng))
  return existing;
 return {
  ...(base||{}),id,name,lat,lng,
  address:base?.address||(station?'鳥取市東品治町111':p.title),
  type:base?.type||classify({name}),category:base?.category||(station?'railway_station':'unknown'),
  source:station?'railway-search':'gsi-search',
  originalSource:base?.source||null,
  verified:station,
  accuracyClass:station?'facility':'area',
  note:station?'JR鳥取駅の代表地点。GPSの位置には誤差があります。':
   '地理院の地名・住所検索による地域の代表位置です。',
  url:base?.url||p.sourceUrl||'https://maps.gsi.go.jp/',
  attributions:[...new Set([...(base?.attributions||[]),p.sourceUrl||'https://maps.gsi.go.jp/'])],
  licenses:base?.licenses||[]
 }
}
function geocodeResultCard(p){
 const place=geoPlace(p);
 // A geocoded hit is a real candidate: open the normal details/journal controls.
 const direct=document.createElement('button');
 direct.className='place-card geocode-card';direct.type='button';
 direct.innerHTML='<span class="symbol">⌕</span><span class="content">'+
  '<span class="name">'+q(place.name)+'</span>'+
  '<span class="badges"><span class="badge badge-reference">地図検索の地点</span></span>'+
  '<span class="minor">'+(place.verified?'施設代表位置・すれ違い対象':
   '住所・地名の代表位置')+'</span></span><span class="arrow">›</span>';
 direct.addEventListener('click',()=>openDetail(place));
 return direct
}
function clearGeocode(){
 geoReqSeq++;
 state.geocodeResult=null
}
async function geocodeSubmittedKeyword(keyword){
 const query=keyword.trim(),seq=++geoReqSeq;
 if(!query||query!==state.query.trim())return;
 const direct=knownPlaceSearch(query);
 if(direct){
  state.geocodeResult=direct;
  renderList();
  focusSearchResults({silent:true});
  return
 }
 const places=allPlaces();
 const oldMatch=places.some(p=>p.lat!=null&&p.lng!=null&&normalizedSearch(p.name)===normalizedSearch(query));
 if(oldMatch)return; // Exact known point already focuses correctly.
 // If an official spot has a fairly specific street address but not a GPS
 // coordinate, retry that address when searching the name finds nothing.
 const ref=places.find(p=>p.lat==null&&p.lng==null&&p.address&&
  normalizedSearch(p.name)===normalizedSearch(query));
 const preciseAddress=ref&&/(?:[0-9０-９]+番地?|[0-9０-９]+号|[0-9０-９]+[-－][0-9０-９]+|[一二三四五六七八九十0-9０-９]+丁目)/.test(ref.address)?
  ref.address:null;
 try{
  let candidates=geoCache.get(query);
  if(!candidates){
   const controller=new AbortController();
   const clock=setTimeout(()=>controller.abort(),9000);
   try{
    const response=await fetch(GEO_SEARCH_URL+'?q='+encodeURIComponent(query),{signal:controller.signal});
    if(!response.ok)throw Error('GSI HTTP '+response.status);
    candidates=parseGsiCandidates(await response.json(),query);
    if(!candidates.length&&preciseAddress){
     const byAddress=await fetch(GEO_SEARCH_URL+'?q='+encodeURIComponent(preciseAddress),
      {signal:controller.signal});
     if(byAddress.ok)
      candidates=parseGsiCandidates(await byAddress.json(),preciseAddress)
       .map(candidate=>({...candidate,title:ref.name,basePlace:ref,matchedAddress:preciseAddress}))
    }
    geoCache.set(query,candidates)
   }finally{clearTimeout(clock)}
  }
  if(seq!==geoReqSeq||query!==state.query.trim())return;
  if(candidates.length){
   state.geocodeResult=candidates[0];
   renderList();
   focusSearchResults({silent:true})
  }else if(!filtered().length){
   $('message').textContent='この地点は地理院検索でも見つかりませんでした。別の地名・住所でお試しください。'
  }
 }catch(err){
  if(seq!==geoReqSeq||query!==state.query.trim())return;
  console.warn('GSI place search unavailable',err);
  if(!filtered().length)$('message').textContent='地名・住所の検索サービスに接続できません。時間をおいて再検索してください。'
 }
}
function resetSearchMap(){
 clearGeocode();
 const old=state.searchOriginalView;
 state.searchMapActive=false;
 state.searchOriginalView=null;
 if(old&&state.map)state.map.setView([old.lat,old.lng],old.zoom,{animate:false});
 mapStamp()
}
function badgeHTML(label,kind){return '<span class="badge badge-'+kind+'">'+q(label)+'</span>'}
function positionBadge(p){return p.lat==null||p.lng==null?(p.source==='official-tourism'?'所在地資料のみ':p.address?'住所のみ':'位置なし'):p.verified===false?'概略位置':p.source==='tottori-city-poi'?'公式座標':'位置あり'}
function badgesFor(p,row){
 const parts=[badgeHTML((TYPES[effectiveType(p)]||TYPES.other)[1],'type')];
 if(p.relatedTypes?.includes('people'))parts.push(badgeHTML('偉人','type'));
 const pos=positionBadge(p);
 parts.push(badgeHTML(pos,p.verified===false||p.lat==null||p.lng==null?'reference':'geo'));
 if(row?.visitedAt)parts.push(badgeHTML('訪問済','visited'));
 else if(row?.nearAt)parts.push(badgeHTML('すれ違い','near'));
 else if(row?.seenAt)parts.push(badgeHTML('発見','seen'));
 return '<span class="badges">'+parts.join('')+'</span>';
}

// The source is the ChatGPT Library image 「和風ピクセルアートアイコンシート」.
// Its twelve icons were cropped and packed into a single 192x144 PNG atlas,
// preserving the original artwork while loading only one small image file.
const ATLAS_ICONS=new Set(['scroll','quill','bust','castle','torii','temple',
 'post','book','food','tree','night','building']);
const POI_18_ICONS=new Set([
 'torii','post','cafe','restaurant','bakery','sweets','seafood','monument',
 'old_house','museum','ruins','kofun','dunes','coast','waterfall','onsen',
 'station','information'
]);
/**
 * Visual subtype is independent from the tabs' primary category/type.
 * Prefer the source's structured category and curated iconKind when present;
 * specific names only refine this without changing the category.
 */
function iconKind(p){
 // The cafe category always takes precedence over stale source-provided iconKind.
 // A missing CSS resource must not cause a legacy scroll icon to appear.
 if(effectiveType(p)==='cafe')return 'cafe-ext';
 if(POI_18_ICONS.has(p.iconKind))return p.iconKind;
 const n=String(p.name||'');
 const c=String(p.category||'').toLowerCase();
 const t=effectiveType(p);
 // Most specific markers first: temple names inside post-office names are common.
 if(/郵便局|郵便ポスト|ゆうちょ|簡易郵便局/.test(n))return 'post';
 if(/観光案内所|ビジターセンター|インフォメーション|観光情報センター/.test(n))return 'information';
 if(/鉄道駅|駅舎|駅$|停車場/.test(n))return 'station';
 if(/神社|神宮|大社|鳥居/.test(n))return 'torii';
 if(/寺院|寺$|寺（|寺\(|観音堂|岩屋堂|投入堂|仏閣/.test(n))return 'temple';
 if(/古墳|墳丘/.test(n))return 'kofun';
 if(/砂丘|風紋/.test(n))return 'dunes';
 if(/滝|瀑布/.test(n))return 'waterfall';
 if(/海岸|海水浴場|海辺|浦富海岸/.test(n))return 'coast';
 if(/温泉|足湯|共同浴場/.test(n))return 'onsen';
 if(/旧宅|生家|旧居|古民家|町家|古い民家/.test(n))return 'old_house';
 if(/城跡|城址|城郭/.test(n))return 'castle';
 if(/遺跡|廃寺跡|史跡公園|台場跡|国庁跡/.test(n))return 'ruins';
 if(/文学碑|歌碑|句碑|詩碑|石碑|記念碑|墓碑|顕彰碑/.test(n))return 'monument';
 if(/博物館|美術館|資料館|記念館|歴史館|民藝美術館/.test(n))return 'museum';
 if(/図書館|文庫/.test(n))return 'book';
 // Food icon is a subtype: a cafe must never inherit the ramen pictogram.
 if(/たくみ割烹店/.test(n))return 'restaurant';
 if(t==='shop'){
  if(/工芸|民藝|民芸/.test(n))return 'shop-craft';
  if(/土産|みやげ|お土産|ギフト/.test(n))return 'shop-souvenir';
  return 'shop-misc'
 }
 if(t==='cafe')return 'cafe-ext';
 if(t==='lodging')return 'building';
 if(c==='cafe'||/カフェ|喫茶|珈琲|コーヒー|coffee|café|cafe|スターバックス|ドトール|タリーズ|すなば珈琲/i.test(n))return 'cafe';
 if(c==='bakery'||/パン屋|パン店|パン工房|ベーカリー|ブーランジェ|bakery/i.test(n))return 'bakery';
 if(/和菓子|甘味|団子|だんご|餅屋|餅菓子|饅頭|まんじゅう|たい焼き/.test(n))return 'sweets';
 if(/海鮮|魚介|海の幸|寿司|すし|鮮魚|魚市場|かに|蟹|かろいち/.test(n))return 'seafood';
 if(/ラーメン|らーめん|らぁ麺|中華そば|つけ麺|牛骨らーめん/.test(n))return 'food';
 if(['restaurant','fast_food','bar_izakaya'].includes(c)||t==='food')return 'restaurant';
 if(/公園|庭園|森|並木|樹木|自然林/.test(n))return 'tree';
 if(t==='shop')return 'building';
 if(t==='temple')return 'temple';
 if(t==='people')return 'bust';
 if(t==='literature')return 'scroll';
 if(t==='history')return 'ruins';
 return 'building'
}
const EXT_ICONS=new Set(['shop-misc','shop-craft','shop-souvenir','cafe-ext']);
function pixelIcon(p){
 const kind=iconKind(p);
 if(EXT_ICONS.has(kind))
  return '<span class="pixel-art ext icon-'+kind+'" aria-hidden="true"></span>';
 if(POI_18_ICONS.has(kind))
  return '<span class="pixel-art v2 icon-'+kind+'" aria-hidden="true"></span>';
 return '<span class="pixel-art icon-'+(ATLAS_ICONS.has(kind)?kind:'building')+'" aria-hidden="true"></span>'
}

function miniMapIcon(p,extraClass=''){
 const accuracy=p.verified===false?' is-approx':'';
 return '<div class="map-icon-pin'+accuracy+(extraClass?' '+extraClass:'')+
  '" title="'+q(p.name)+'"><span class="map-poi-icon">'+pixelIcon(p)+'</span></div>'
}
function mapPoiIcon(p,extraClass=''){
 return L.divIcon({className:'map-poi-leaflet-icon',html:miniMapIcon(p,extraClass),
  iconSize:[38,44],iconAnchor:[19,41],popupAnchor:[0,-38]})
}
function fillPlaceCard(place,row){const btn=document.createElement('button');btn.className='place-card';btn.type='button';btn.dataset.id=place.id;const [,label]=TYPES[place.type]||TYPES.other;btn.innerHTML=`<span class="symbol" aria-hidden="true">${pixelIcon(place)}</span><span class="content"><span class="name">${q(place.name)}</span>${badgesFor(place,row)}<span class="minor">${q(prettyDist(place))}</span></span><span class="arrow" aria-hidden="true">›</span>`;btn.addEventListener('click',()=>openDetail(place));return btn}
function literaryWorkMatches(work){
 const term=normalizedSearch(state.query);
 if(!term&&work.area!==state.area)return false;
 if(!term)return true;
 const hay=normalizedSearch([work.title,work.author,work.place].join(' '));
 return term.split(/\s+/).every(part=>hay.includes(part))
}

/* A book is not an extra POI: no ID or journal entry is created for a book. */
function literaryMapGroups(){
 const term=normalizedSearch(state.query);
 const works=LITERARY_WORKS_03.filter(literaryWorkMatches);
 if(!(state.filter==='literature'||(term&&works.length)))return [];
 const matches=new Map(works.map(w=>[w.id,w]));
 const fallback=new Map(LITERARY_MAP_05.anchors.map(a=>[a.id,a]));
 const mapped=[...GUIDES,...CULTURE_SPOTS,...LITERARY_BATCH_01,...LITERARY_PLACES_03,
  ...LITERARY_SITES_04,...OFFICIAL_LANDMARKS,...HOSAI_MONUMENTS].map(withCatalog);
 const places=new Map(mapped.map(p=>[p.id,p]));
 const groups=new Map();
 for(const link of LITERARY_MAP_05.links){
  const work=matches.get(link.workId);
  if(!work)continue;
  const place=places.get(link.anchorId),region=fallback.get(link.anchorId);
  const exactEnough=place&&Number.isFinite(place.lat)&&Number.isFinite(place.lng);
  const anchor=exactEnough?place:region;
  if(!anchor||!Number.isFinite(anchor.lat)||!Number.isFinite(anchor.lng))continue;
  if(!groups.has(link.anchorId)){
   groups.set(link.anchorId,{
    id:link.anchorId,lat:anchor.lat,lng:anchor.lng,
    name:exactEnough?place.name:region.name,
    note:exactEnough?'登録地点の代表座標。作中の場面の位置を特定したものではありません。':region.note,
    sourceUrl:exactEnough?place.url:region.sourceUrl,place:place||null,
    works:[]
   })
  }
  groups.get(link.anchorId).works.push(work)
 }
 return [...groups.values()]
}
function literaryMapGroupForWork(workId){
 return literaryMapGroups().find(g=>g.works.some(w=>w.id===workId))
}
function openLiteraryMapGroup(group,selectedWorkId=''){
 $('literaryMapTitle').textContent=group.name+' · '+group.works.length+'作品';
 $('literaryMapNote').textContent='登場地・作家ゆかりの地域の目安です。'+group.note;
 $('literaryMapList').replaceChildren(...group.works.map(w=>{
  const section=document.createElement('section');section.className='literary-map-work';
  if(w.id===selectedWorkId)section.classList.add('selected');
  const title=document.createElement('strong');title.textContent=w.title;
  const meta=document.createElement('p');meta.textContent=w.author+' · 関連地：'+w.place;
  const buttons=document.createElement('div');buttons.className='literary-work-actions';
  const source=document.createElement('a');source.href=w.sourceUrl;
  source.target='_blank';source.rel='noopener noreferrer';source.textContent='資料を開く ↗';
  buttons.appendChild(source);
  if(group.place){
   const b=document.createElement('button');b.type='button';b.textContent='関連地点の詳細';
   b.addEventListener('click',()=>{$('literaryMapDialog').close();openDetail(group.place)});
   buttons.appendChild(b)
  }
  section.append(title,meta,buttons);return section
 }));
 $('literaryMapDialog').showModal()
}
function focusLiteraryWork(workId){
 const group=literaryMapGroupForWork(workId);
 if(!group){toast('地図に関連地を表示できません');return}
 if(!state.map){toast('地図が読み込めません');return}
 if(state.query&&!state.searchOriginalView){
  const pos=state.map.getCenter();
  state.searchOriginalView={lat:pos.lat,lng:pos.lng,zoom:state.map.getZoom()}
 }
 state.map.setView([group.lat,group.lng],Math.max(14,state.map.getZoom()),{animate:false});
 document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
 refreshMapSize(100);
 openLiteraryMapGroup(group,workId)
}
function renderLiteraryMapPins(){
 if(!state.map||!window.L)return;
 for(const group of literaryMapGroups()){
  const icon=L.divIcon({className:'literary-map-leaflet',iconSize:[48,40],iconAnchor:[1,41],
   html:'<div class="literary-map-pin" title="'+q(group.name)+'"><span class="pixel-art icon-book" aria-hidden="true"></span><b>'+group.works.length+'</b></div>'});
  L.marker([group.lat,group.lng],{icon,zIndexOffset:1300})
   .on('click',()=>openLiteraryMapGroup(group)).addTo(state.markers)
 }
}
function renderLiteraryWorks(){
 const pane=$('literaryWorksSection');
 const works=LITERARY_WORKS_03.filter(literaryWorkMatches);
 const show=(state.filter==='literature'||(!!state.query.trim()&&works.length>0))&&state.tab==='places';
 pane.hidden=!show;
 if(!show)return;
 const limit=state.workShowAll?works.length:8;
 $('literaryWorkCount').textContent=works.length+'作品';
 $('literaryWorkCards').replaceChildren(...works.slice(0,limit).map(work=>{
  const card=document.createElement('div');card.className='literary-work-card';
  const title=document.createElement('strong');title.textContent=work.title;
  const line=document.createElement('div');line.className='literary-work-author';line.textContent=work.author+' · '+work.place;
  const actions=document.createElement('div');actions.className='literary-work-actions';
  const src=document.createElement('a');src.href=work.sourceUrl;src.target='_blank';src.rel='noopener noreferrer';
  src.textContent='県立図書館の資料 ↗';
  if(literaryMapGroupForWork(work.id)){
   const mapButton=document.createElement('button');mapButton.type='button';
   mapButton.textContent='⌖ 地図で見る';
   mapButton.addEventListener('click',()=>focusLiteraryWork(work.id));actions.appendChild(mapButton)
  }
  const place=state.places.find(p=>p.id===work.targetId);
  if(place){
   const b=document.createElement('button');b.type='button';b.textContent='関連地点を開く';
   b.addEventListener('click',()=>openDetail(place));actions.appendChild(b)
  }
  actions.appendChild(src);card.append(title,line,actions);return card
 }));
 $('literaryWorkMore').hidden=works.length<=8;
 $('literaryWorkMore').textContent=state.workShowAll?'少なく表示':'残り'+(works.length-8)+'作品を見る';
}
function renderList(){
 state.places=allPlaces();
 const list=filtered(),search=state.query.trim(),candidate=search?state.geocodeResult:null;
 const geo=candidate&&!list.some(p=>placeKey(p)===placeKey(geoPlace(candidate)))?candidate:null;
 $('placesCount').textContent=list.length+(geo?1:0);
 $('places').replaceChildren(...(geo?[geocodeResultCard(geo)]:[]),...list.map(p=>fillPlaceCard(p,journalRecordFor(p))));
 renderLiteraryWorks();
 if(!state.loading)$('message').textContent=search?
  (list.length||geo?`「${search}」の検索結果 ${list.length+(geo?1:0)}件（地図外の登録地点・地図検索を含む）`:
   (literaryMapGroups().length?`「${search}」の文学作品が地図で見つかりました。`:
    `「${search}」に一致する地点はありません。`)):
  (list.length?`${list.length}か所`:'この条件の場所はありません。エリアやジャンルを変えてください。');
 // Pins represent *all* mapped places in the viewport, not the 50-card
 // reading limit of the result list.
 drawMarkers()
}
const JOURNAL_STATES=[
 {id:'seen',label:'みつけた',date:'seenAt'},
 {id:'near',label:'すれ違い',date:'nearAt'},
 {id:'visited',label:'訪れた',date:'visitedAt'}
];
function latestJournalStatus(row){
 // Keep all original timestamps, display each entry only in its furthest phase.
 if(row?.visitedAt)return 'visited';
 if(row?.nearAt)return 'near';
 if(row?.seenAt)return 'seen';
 return 'none'
}
function filteredJournalRows(){
 const category=state.journalFilter,status=state.journalStatus;
 return journalRows().filter(row=>row&&row.place)
  .filter(row=>belongsToCategory(row.place,category))
  .filter(row=>status==='all'||latestJournalStatus(row)===status)
}
function renderJournal(){
 const all=journalRows();
 const byCategory=all.filter(row=>belongsToCategory(row.place,state.journalFilter));
 const rows=filteredJournalRows().sort((a,b)=>
   new Date(b.visitedAt||b.nearAt||b.seenAt||0)-new Date(a.visitedAt||a.nearAt||a.seenAt||0));
 $('journalCount').textContent=all.length;
 $('journalShownCount').textContent=rows.length+'件';
 $('stats').innerHTML=JOURNAL_STATES.map(item=>{
  const count=byCategory.filter(row=>latestJournalStatus(row)===item.id).length;
  const active=state.journalStatus===item.id;
  return `<button class="stat${active?' active':''}" type="button"
    data-journal-status="${item.id}" aria-pressed="${active}">
    <b>${count}</b><small>${item.label}</small></button>`
 }).join('');
 $('journal').replaceChildren(...(rows.length?rows.map(r=>fillPlaceCard(r.place,r)):
  [Object.assign(document.createElement('div'),{className:'empty',
   textContent:all.length?'この条件の記録はまだありません。':'旅の記録はまだありません。'})]));
}
function setJournalFilter(category){
 state.journalFilter=(category==='all'||Object.hasOwn(TYPES,category))?category:'all';
 renderJournal()
}
function toggleJournalStatus(status){
 if(!JOURNAL_STATES.some(x=>x.id===status))return;
 state.journalStatus=state.journalStatus===status?'all':status;
 renderJournal()
}
function markerCategory(p){
 // A dual-classified literary landmark is a people marker while the people
 // filter is active; otherwise it keeps its primary category in "all".
 if(state.filter!=='all'&&(p.type===state.filter||p.relatedTypes?.includes(state.filter)))
  return state.filter;
 return TYPES[effectiveType(p)]?effectiveType(p):'other'
}
function openLiteraryReferenceGroup(spots){
 // Multiple literary inscriptions can share one *approximate* area center.
 // Let the visitor choose a specific inscription instead of stacking icons.
 $('literaryMapTitle').textContent='文学碑・句碑 · '+spots.length+'地点';
 $('literaryMapNote').textContent='周辺の参考位置を共有しています。個々の碑の正確な場所ではありません。';
 $('literaryMapList').replaceChildren(...spots.map(p=>{
  const section=document.createElement('section');section.className='literary-map-work';
  const title=document.createElement('strong');title.textContent=p.name;
  const sub=document.createElement('p');sub.textContent=p.address||'所在地は未確認';
  const actions=document.createElement('div');actions.className='literary-work-actions';
  const btn=document.createElement('button');btn.type='button';btn.textContent='この地点の詳細';
  btn.addEventListener('click',()=>{$('literaryMapDialog').close();openDetail(p)});
  actions.appendChild(btn);
  section.append(title,sub,actions);return section
 }));
 $('literaryMapDialog').showModal()
}
function drawMarkers(){
 if(!state.map||!window.L)return;
 state.markers.clearLayers();
 const bounds=state.map.getBounds();
 const searching=!!state.query.trim();
 const list=state.places.filter(p=>matches(p)&&
  Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
  (searching||!bounds?.isValid()||bounds.contains([p.lat,p.lng])));
 const approximateGroups=new Map();
 for(const p of list){
  if(p.lat==null||p.lng==null)continue;
  if(p.locationSource==='literary-reference'){
   const key=p.lat.toFixed(5)+','+p.lng.toFixed(5);
   if(!approximateGroups.has(key))approximateGroups.set(key,[]);
   approximateGroups.get(key).push(p);
   continue
  }
  const icon=mapPoiIcon(p);
  const marker=L.marker([p.lat,p.lng],{icon});
  marker.on('click',()=>openDetail(p));
  marker.addTo(state.markers)
 }
 for(const originals of approximateGroups.values()){
  // A broad "literary monuments in the area" umbrella record should not
  // inflate the count when its five individual inscriptions are also listed.
  const individual=originals.filter(p=>p.group!=='literary-cluster');
  const spots=individual.length?individual:originals;
  const first=spots[0],cluster=spots.length>1;
  const icon=cluster?
   L.divIcon({className:'literary-map-leaflet',iconSize:[48,40],iconAnchor:[1,41],
    html:'<div class="literary-map-pin literary-reference-pin" title="参考地点の文学碑 '+spots.length+'件"><span class="pixel-art icon-book" aria-hidden="true"></span><b>'+spots.length+'</b></div>'}):
   mapPoiIcon(first);
  L.marker([first.lat,first.lng],{icon,zIndexOffset:cluster?1450:200})
   .on('click',()=>cluster?openLiteraryReferenceGroup(spots):openDetail(first))
   .addTo(state.markers)
 }
 if(state.query.trim()&&state.geocodeResult&&
    !list.some(p=>placeKey(p)===placeKey(geoPlace(state.geocodeResult)))){ 
  // Show a highlighted temporary icon only when no ordinary matching pin exists.
  // Never create two stacked markers for a saved station such as 鳥取駅.
  const p=state.geocodeResult,place=geoPlace(p);
  const icon=mapPoiIcon(place,'is-search');
  L.marker([p.lat,p.lng],{icon,zIndexOffset:1600})
   .on('click',()=>openDetail(place)).addTo(state.markers)
 }
 renderLiteraryMapPins();
 if(state.gps){
  // Current GPS position is distinct in both shape and color from all categories.
  const gpsIcon=L.divIcon({
   className:'',html:'<div class="gps-position" aria-hidden="true"><span></span></div>',
   iconSize:[26,26],iconAnchor:[13,13]
  });
  L.marker([state.gps.lat,state.gps.lng],{icon:gpsIcon,zIndexOffset:2500,
   interactive:false,keyboard:false}).addTo(state.markers)
 }
}
// Match the stable map implementation in yama-books/mansion-poet:
// ordinary Leaflet TileLayer, GSI pale tiles, no custom GridLayer / tile fallbacks.
// OpenPOI provides only facility coordinates and is independent of basemap images.
const MAP_PROVIDERS={
 gsi:{label:'地理院',url:'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
  options:{attribution:'地理院タイル',maxZoom:18,minZoom:5}},
 osm:{label:'OSM',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  options:{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
   maxZoom:18,minZoom:5}}
};
let mapResizeTimer=null,mapBaseLayer=null,mapProvider='gsi',mapTileErrors=0,mapTileLoads=0;
function refreshMapSize(delay=80){
 if(!state.map)return;
 clearTimeout(mapResizeTimer);
 mapResizeTimer=setTimeout(()=>{if(state.map){state.map.invalidateSize({pan:false,animate:false});inspectMapRendering()}},delay);
}
function mapStamp(label=''){
 const name=state.searchMapActive?'検索結果':AREAS[state.area]?.name||'現在地';
 $('mapStamp').textContent=name+' · '+(label||MAP_PROVIDERS[mapProvider].label);
}
function googleMapsLink(p){
 const param=p.lat!=null&&p.lng!=null?(p.lat+','+p.lng):(p.mapQuery||[p.name,where(p)].filter(Boolean).join(' '));
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(param);
}
function showMapFailure(){
 $('mapFallback').hidden=false;
 mapStamp('読込不可');
 $('mapFallbackLink').href=googleMapsLink(state.map?state.map.getCenter():state.center);
}
function inspectMapRendering(){
 if(!state.map)return;
 const host=$('map'),info=$('mapDebug');
 if(!host||!info)return;
 const pane=host.querySelector('.leaflet-tile-pane');
 const tile=host.querySelector('.leaflet-tile');
 const panePosition=pane?getComputedStyle(pane).position:'missing';
 const tilePosition=tile?getComputedStyle(tile).position:'none';
 const cssOK=panePosition==='absolute'&&(!tile||tilePosition==='absolute');
 const expected=state.map.getSize();
 const nodes=host.querySelectorAll('img.leaflet-tile');
 const loaded=host.querySelectorAll('img.leaflet-tile-loaded').length;
 const show=window.location.search.includes('mapdebug=1')||!cssOK;
 info.hidden=!show;
 if(show)info.textContent='CSS '+(cssOK?'OK':'NG')+' / DOM '+host.clientWidth+'×'+host.clientHeight+' / L '+expected.x+'×'+expected.y+' / タイル '+loaded+'/'+nodes.length+' / 失敗 '+mapTileErrors;
 if(!cssOK)console.warn('Leaflet stylesheet missing or overridden',{panePosition,tilePosition});
}
function mapTileWarning(){
 if(mapTileErrors===0)return;
 $('mapNotice').hidden=false;
 $('mapNoticeText').textContent='地図画像を読み込めません ('+mapTileErrors+'枚)';
 $('mapNoticeLink').href=googleMapsLink(state.map?state.map.getCenter():state.center);
}
function switchMapProvider(next){
 if(!state.map||!window.L)return;
 const provider=MAP_PROVIDERS[next];
 if(!provider)return;
 mapTileLoads=0;mapTileErrors=0;
 const layer=L.tileLayer(provider.url,provider.options);
 // An error must NEVER replace the entire layer: keep healthy imagery intact.
 layer.on('tileload',()=>{mapTileLoads++;inspectMapRendering()});
 layer.on('tileerror',()=>{mapTileErrors++;mapTileWarning();inspectMapRendering()});
 layer.on('load',()=>{
  if(mapTileLoads===0&&mapTileErrors>0)showMapFailure();
  else if(mapTileLoads>0)$('mapFallback').hidden=true;
  inspectMapRendering();
 });
 const previous=mapBaseLayer;
 mapProvider=next;mapBaseLayer=layer;
 $('mapFallback').hidden=true;
 $('mapNotice').hidden=true;
 mapStamp();
 layer.addTo(state.map);
 setTimeout(inspectMapRendering,350);
 if(previous)state.map.removeLayer(previous);
 refreshMapSize();
}
function changeMapProvider(){
 switchMapProvider(mapProvider==='gsi'?'osm':'gsi');
 toast(MAP_PROVIDERS[mapProvider].label+' に切り替えました');
}
function reloadMapTiles(){
 switchMapProvider(mapProvider);
 toast('地図を再読み込みします');
}
// One-handed zoom: tap twice, keep the second touch down, slide upward to
// zoom in (downward to zoom out). Ordinary panning and two-finger pinch remain.
function setupDoubleTapSlideZoom(map){
 if(!('ontouchstart' in window))return;
 const host=map.getContainer();
 // The standard Leaflet dblclick handler would otherwise double-zoom on iOS.
 map.doubleClickZoom.disable();
 let lastTap=null,firstTouch=null,gesture=null;
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const coord=t=>({x:t.clientX,y:t.clientY});
 const finish=(allowTap)=>{
  if(!gesture)return;
  const g=gesture;gesture=null;
  if(allowTap&&!g.moved){
   map.setZoomAround(g.anchor,Math.min(18,g.zoom+1),{animate:true});
  }
  if(g.dragEnabled)map.dragging.enable();
 };
 host.addEventListener('touchstart',e=>{
  if(e.touches.length!==1){firstTouch=null;lastTap=null;finish(false);return}
  const finger=coord(e.touches[0]),now=Date.now();
  if(lastTap&&now-lastTap.at<=380&&dist(finger,lastTap)<=38){
   const rect=host.getBoundingClientRect();
   const p=L.point(finger.x-rect.left,finger.y-rect.top);
   gesture={anchor:map.containerPointToLatLng(p),startY:finger.y,zoom:map.getZoom(),
    moved:false,dragEnabled:map.dragging.enabled(),lastUpdate:0};
   firstTouch=null;lastTap=null;
   map.dragging.disable();
   if(e.cancelable)e.preventDefault();
   e.stopPropagation();
   return;
  }
  firstTouch={...finger,at:now,moved:false};
 },{capture:true,passive:false});
 host.addEventListener('touchmove',e=>{
  if(gesture){
   if(e.touches.length!==1){finish(false);return}
   if(e.cancelable)e.preventDefault();
   e.stopPropagation();
   const y=e.touches[0].clientY,delta=gesture.startY-y;
   if(Math.abs(delta)>=8)gesture.moved=true;
   if(gesture.moved){
    const now=Date.now();
    if(now-gesture.lastUpdate>=35){
     const z=Math.max(5,Math.min(18,Math.round((gesture.zoom+delta/95)*4)/4));
     if(z!==map.getZoom())map.setZoomAround(gesture.anchor,z,{animate:false});
     gesture.lastUpdate=now;
    }
   }
   return;
  }
  if(firstTouch&&e.touches.length===1&&dist(coord(e.touches[0]),firstTouch)>12)
   firstTouch.moved=true;
 },{capture:true,passive:false});
 host.addEventListener('touchend',e=>{
  if(gesture){
   if(e.cancelable)e.preventDefault();
   e.stopPropagation();
   if(e.touches.length===0)finish(true);
   return;
  }
  if(firstTouch&&e.touches.length===0){
   if(!firstTouch.moved&&Date.now()-firstTouch.at<300)
    lastTap={x:firstTouch.x,y:firstTouch.y,at:Date.now()};
   else lastTap=null;
   firstTouch=null;
  }
 },{capture:true,passive:false});
 host.addEventListener('touchcancel',()=>{lastTap=null;firstTouch=null;finish(false)},{capture:true});
}
function mapInit(){
 if(!window.L){
  showMapFailure();
  $('mapSourceBtn').disabled=true;
  $('mapRetryBtn').disabled=true;
  return;
 }
 try{
  // These settings and layer URL mirror APP-003's reliably rendered map.
  state.map=L.map('map',{zoomControl:false,scrollWheelZoom:false,zoomSnap:0.25,tapHold:false})
   .setView([state.center.lat,state.center.lng],16);
  switchMapProvider('gsi');
  L.control.zoom({position:'bottomleft'}).addTo(state.map);
  state.markers=L.layerGroup().addTo(state.map);
  state.map.on('moveend',()=>{renderList();updateSearchHereButton()});
  setupDoubleTapSlideZoom(state.map);
  refreshMapSize(80);
  window.addEventListener('resize',()=>refreshMapSize(100));
  window.addEventListener('orientationchange',()=>refreshMapSize(180));
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden)refreshMapSize(100);
  });
 }catch(err){
  console.warn('Map initialization failed',err);
  showMapFailure();
 }
}
async function viewOnMap(){
 let p=state.selected;
 if(!p)return;
 // Always resolve against current registered dataset, not an older journal
 // snapshot. The literary reference coordinate is available *before* a tap.
 const current=currentGuides().find(item=>item.id===p.id);
 if(current&&(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||
     p.locationSource==='literary-reference'))p=withCatalog(current);
 else p=withCatalog(p);
 if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng)){
  // A late API lookup is for genuinely unlocated non-literary addresses only.
  p=await resolveRegisteredAddress(p,{retry:true});
  if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)){
   toast('この地点の地図位置はまだ登録されていません');
   return
  }
 }
 state.selected=p;
 $('detail').close();
 if(state.tab==='journal')showTab('places');
 if(!state.map){window.open(googleMapsLink(p),'_blank','noopener');return}
 if(state.focusMarker)state.map.removeLayer(state.focusMarker);
 state.map.setView([p.lat,p.lng],Math.max(15,state.map.getZoom()),{animate:false});
 const icon=mapPoiIcon(p,'is-focus');
 state.focusMarker=L.marker([p.lat,p.lng],{icon,zIndexOffset:1000}).addTo(state.map);
 $('mapFallbackLink').href=googleMapsLink(p);$('mapNoticeLink').href=googleMapsLink(p);
 document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
 refreshMapSize(160)
}
function updateMap(){const c=state.center;mapStamp();if(state.map){if(state.focusMarker){state.map.removeLayer(state.focusMarker);state.focusMarker=null}state.map.setView([c.lat,c.lng],16);refreshMapSize(100)}$('mapFallbackLink').href=googleMapsLink(c);$('mapNoticeLink').href=googleMapsLink(c);renderList()}
let reqSeq=0,geoReqSeq=0;
const GEO_SEARCH_URL='https://msearch.gsi.go.jp/address-search/AddressSearch';
const geoCache=new Map();
async function fetchPlaces(extra=state.query,focusAfterSearch=false){
 const seq=++reqSeq;
 state.loading=true;
 $('message').textContent='施設を探しています…';
 try{
  const bounds=state.map?.getBounds();
  const useBounds=!!bounds?.isValid();
  const center=state.map?state.map.getCenter():state.center;
  const qs=new URLSearchParams({center:`${center.lng},${center.lat}`,limit:'200'});
  if(useBounds){
   qs.set('bbox',[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()].join(','));
  }else qs.set('radius','6000');
  state.lastSearchedCenter={lat:center.lat,lng:center.lng};
  state.lastSearchedZoom=state.map?.getZoom()??16;
  updateSearchHereButton();
  if(extra)qs.set('q',extra);const controller=new AbortController();const tm=setTimeout(()=>controller.abort(),11000);let response;try{response=await fetch(`${API}?${qs}`,{signal:controller.signal})}finally{clearTimeout(tm)}if(!response.ok)throw new Error('HTTP '+response.status);const json=await response.json();if(seq!==reqSeq)return;state.results=(Array.isArray(json.results)?json.results:[]).map(normalize).filter(Boolean).filter(p=>!isNightlifeName(p.name));state.lastFetch=Date.now();}catch(err){if(seq!==reqSeq)return;state.results=[];$('message').textContent='施設データが読み込めません。参考スポットのみ表示します。';console.warn('OpenPOI search unavailable',err)}finally{if(seq===reqSeq){state.loading=false;renderList();if(focusAfterSearch&&extra===state.query)focusSearchResults({silent:true});updateSearchHereButton();checkNear();void enrichRegisteredLocations()}}}
function openDetail(p){
 p=withCatalog(p);
 const saved=journalRecordFor(p)?.place;
 // Do not undo a previously confirmed location when the original listing has
 // an older, unverified copy of this place.
 if(saved?.verified===true&&p.verified!==true&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lng))
  p=withCatalog(saved);
 state.selected=p;eventFor(p,'seen');const row=journalRecordFor(p);
 $('detailType').textContent=(TYPES[effectiveType(p)]||TYPES.other)[1];
 $('detailName').textContent=p.name;
 $('detailIcon').innerHTML=pixelIcon(p); // Same atlas art as the selected map pin.
 $('detailMeta').textContent=[where(p),prettyDist(p)].filter(Boolean).join(' · ');

 $('detailNote').textContent=p.note||'気になったら、旅帖に残しておきましょう。';
 const curated=String(p.id||'').startsWith('culture:')||String(p.id||'').startsWith('night:')||p.source==='curated';
 const sourceLabel=p.source==='tottori-city-poi'?'鳥取市オープンデータ':p.source==='official-tourism'?'とっとり旅（公式）':p.source==='guide'?'観光・施設資料':p.source==='gsi-search'?'国土地理院・地名住所検索':p.source==='railway-search'?'駅位置資料':curated||p.source==='reference'?'公開資料':'OpenPOI API';
 const sourceURL=p.source==='tottori-city-poi'?HOSAI_DATASET:curated||p.source==='reference'||p.source==='guide'||p.source==='official-tourism'||p.source==='gsi-search'||p.source==='railway-search'?p.url:null;
 const safeSource=sourceURL&&/^https:\/\//.test(sourceURL)?'<a class="detail-source" href="'+q(sourceURL)+'" target="_blank" rel="noopener noreferrer">'+sourceLabel+' ↗</a>':'<small class="detail-source">'+sourceLabel+'</small>';
 $('detailTags').innerHTML=badgesFor(p,row)+safeSource+(p.locationSource==='literary-reference'?
  '<small class="detail-source">参考地点（'+q(p.referenceLabel||'広域の代表位置')+'・自動すれ違い対象外）</small>':
  p.verified===false?'<small class="detail-source">周辺の代表位置（近隣すれ違い判定）</small>':'');
 // Address display works without any position-confirmation / GPS opt-in button.
 $('viewOnMapBtn').disabled=(p.lat==null||p.lng==null)&&!addressQueryText(ADDRESS_CATALOG.get(p.id)?.address||p.address);
 $('visitBtn').textContent=row.visitedAt?'✓ 訪問済':'✓ 訪れた';
 $('visitBtn').setAttribute('aria-label',row.visitedAt?'訪問を記録済み':'訪問を記録');
 $('nearBtn').textContent=row.nearAt?'◇ 記録済':'◇ すれ違い';
 $('nearBtn').setAttribute('aria-label',row.nearAt?'すれ違いを記録済み':'すれ違いを記録');
 $('detail').showModal();renderList()
}
function recordClick(kind){const p=state.selected;if(!p)return;eventFor(p,kind);toast(kind==='visited'?'訪問を旅帖に追加しました':'すれ違いを記録しました');$('detail').close();renderList();if(state.tab==='journal')renderJournal()}
function isTottori(p){return p.lat>=35.0&&p.lat<=35.65&&p.lng>=133.11&&p.lng<=134.58}
function locationFailure(err){status(err?.code===1?'位置情報が拒否されました':'現在地を取得できません');toast('位置情報の設定をご確認ください')}
function onLocation(pos,recenter){const p={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};const inPref=isTottori(p);state.gps=inPref?p:null;status(inPref?`現在地を取得 · 精度 約${Math.round(p.accuracy)}m`:'鳥取県外 · 鳥取のスポットを表示',inPref);if(recenter){if(!inPref){toast('現在地は鳥取県外です。鳥取のエリアを表示します');renderList();return}state.center={lat:p.lat,lng:p.lng};const ks=Object.keys(AREAS);state.area=ks.reduce((a,b)=>meters(p,AREAS[b])<meters(p,AREAS[a])?b:a);$('area').value=state.area;updateMap();fetchPlaces()}else{drawMarkers();if(!inPref)return;checkNear();if(state.tracking&&(!state.lastLoc||meters(p,state.lastLoc)>300)&&Date.now()-state.lastFetch>60000){state.center={lat:p.lat,lng:p.lng};state.lastLoc=p;updateMap();fetchPlaces()}}}
function locate(){if(!navigator.geolocation){toast('この端末では現在地を取得できません');return}status('現在地を確認中…');navigator.geolocation.getCurrentPosition(p=>onLocation(p,true),locationFailure,{enableHighAccuracy:true,timeout:12000,maximumAge:15000})}
function canAutoDetect(p){
 if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return false;
 // A broad author/inscription neighborhood is a map hint, not a GPS hit.
 if(p.locationSource==='literary-reference')return false;
 // A mapped district is enough for an approximate "passed nearby" event.
 // Do not make dozens of individual literary monuments from one shared area pin.
 if(p.group||/個別の碑位置|個別位置|作品の舞台/.test(String(p.address||'')))return false;
 return p.verified===true||p.locationSource==='address-catalog'||
  ['guide','official-tourism','reference'].includes(p.source)
}
function checkNear(){
 if(!state.tracking||!state.gps||state.gps.accuracy>140)return;
 // Source-agnostic: registered geocodes, official, curated and API sites all qualify
 // whenever their coordinates are confirmed as a facility-level point.
 const candidates=new Map();
 for(const p of [...state.results,...currentGuides(),
  ...Object.values(state.journal).map(row=>row?.place).filter(Boolean)]){
  if(canAutoDetect(p))candidates.set(placeKey(p),p)
 }
 let found=0;
 for(const p of candidates.values()){
  const radius=p.verified===true?250:400;
  if(meters(state.gps,p)<=radius&&!journalRecordFor(p)?.nearAt){
   eventFor(p,'near');found++
  }
 }
 if(found){toast(`${found}か所とすれ違いました`);renderList();
  if(state.tab==='journal')renderJournal()}
}
function toggleTracking(){if(state.tracking){navigator.geolocation.clearWatch(state.watch);state.watch=null;state.tracking=false;$('trackBtn').textContent='◇ すれ違い OFF';$('trackBtn').setAttribute('aria-pressed','false');return}if(!navigator.geolocation){toast('位置情報が使えません');return}state.tracking=true;$('trackBtn').textContent='◆ すれ違い ON';$('trackBtn').setAttribute('aria-pressed','true');state.watch=navigator.geolocation.watchPosition(p=>onLocation(p,false),err=>{locationFailure(err);toggleTracking()},{enableHighAccuracy:true,maximumAge:10000,timeout:20000})}
function focusLiteraryRegion(){
 if(!state.map||state.query.trim()||state.filter!=='literature')return;
 const groups=literaryMapGroups();
 if(!groups.length)return;
 const coords=groups.map(g=>[g.lat,g.lng]);
 if(coords.length===1)state.map.setView(coords[0],13,{animate:false});
 else state.map.fitBounds(coords,{padding:[45,45],maxZoom:13,animate:false})
}
function chooseFilter(f){
 if(f!=='all'&&!TYPES[f])return;
 state.filter=f;
 for(const b of document.querySelectorAll('[data-filter]')){
  const on=b.dataset.filter===f;
  b.classList.toggle('active',on);
  b.setAttribute('aria-pressed',String(on))
 }
 if(!state.results.length||!state.lastFetch)fetchPlaces();
 else renderList();
 if(f==='literature')focusLiteraryRegion()
}
function resetArea(){const a=AREAS[$('area').value];state.area=$('area').value;state.center={lat:a.lat,lng:a.lng};state.gps=null;status(a.name+'の地図 · 現在地未取得');state.query='';$('search').value='';state.lastQuery='';state.searchMapActive=false;state.searchOriginalView=null;clearGeocode();updateMap();fetchPlaces();if(state.filter==='literature')focusLiteraryRegion()}
function onSearchInput(){
 const previous=state.query;
 state.query=$('search').value.trim();
 if(previous&&!state.query)resetSearchMap(); // Return to the map location before search.
 else if(previous!==state.query)clearGeocode();
 renderList(); // Local and curated results respond immediately, including during IME entry.
 if(previous&&!state.query)fetchPlaces(''); // Clearing the search restores nearby API data.
}
function doSearch(ev){
 ev.preventDefault();
 state.query=$('search').value.trim(); // Keep the query until cleared by the user.
 clearGeocode(); // Only current submitted search can have a temporary address pin.
 if(state.query){
  state.filter='all';
  for(const b of document.querySelectorAll('[data-filter]')){
   const on=b.dataset.filter==='all';
   b.classList.toggle('active',on);
   b.setAttribute('aria-pressed',String(on))
  }
 }
 // The search bar is also available while the journal tab is selected.
 if(state.tab!=='places')showTab('places');
 else renderList();
 $('search').blur(); // Dismiss the iPhone keyboard when search is submitted.
 // Query the current map viewport before panning to offscreen curated matches.
 // When API results arrive, extend the map view to their geocoded matches.
 fetchPlaces(state.query,!!state.query);
 if(state.query){
  focusSearchResults({silent:true});
  // Books matched by title or author should not be mistaken for street addresses.
  if(!LITERARY_WORKS_03.some(w=>literaryWorkMatches(w)))geocodeSubmittedKeyword(state.query);
  document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
 }else{
  resetSearchMap();
  $('places').scrollIntoView({behavior:'smooth',block:'start'})
 }
}
function dataRows(category='all',status='all',raw=false){
 return (raw?Object.values(state.journal):journalRows())
 .filter(v=>v&&v.place&&belongsToCategory(v.place,category))
 .filter(v=>status==='all'||latestJournalStatus(v)===status)
 .sort((a,b)=>new Date(a.seenAt||a.nearAt||a.visitedAt||0)-new Date(b.seenAt||b.nearAt||b.visitedAt||0))
}
function stamp(d){if(!d)return '';const v=new Date(d);return Number.isNaN(v.getTime())?'':new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(v)}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function backup(){const payload={app:'とっとりトリップ',version:1,exportedAt:new Date().toISOString(),entries:dataRows('all','all',true)};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'tottori-trip-backup.json');toast('バックアップを作成しました')}
async function restore(ev){const file=ev.target.files?.[0];ev.target.value='';if(!file)return;if(file.size>3000000){toast('ファイルが大きすぎます');return}try{const data=JSON.parse(await file.text());if(data.app!=='とっとりトリップ'||!Array.isArray(data.entries)||data.entries.length>3000)throw Error('invalid file');let count=0;for(const row of data.entries){if(!row||typeof row.id!=='string'||row.id.length>220||typeof row.place?.name!=='string'||row.place.name.length>150)continue;const p=row.place;const safe={id:row.id,name:p.name.slice(0,130),type:Object.hasOwn(TYPES,p.type)?p.type:'other',lat:Number.isFinite(Number(p.lat))&&p.lat!==null?Number(p.lat):null,lng:Number.isFinite(Number(p.lng))&&p.lng!==null?Number(p.lng):null,address:String(p.address||'').slice(0,180),note:String(p.note||'').slice(0,400),source:String(p.source||''),verified:p.verified===true,licenses:Array.isArray(p.licenses)?p.licenses.slice(0,15):[],attributions:Array.isArray(p.attributions)?p.attributions.slice(0,15):[]};state.journal[row.id]={id:row.id,place:safe,seenAt:safeDate(row.seenAt),nearAt:safeDate(row.nearAt),visitedAt:safeDate(row.visitedAt)};count++}save();renderJournal();toast(`${count}件を復元しました`)}catch{toast('復元できないJSONファイルです')}}
function safeDate(s){if(typeof s!=='string'||s.length>40)return null;return Number.isNaN(Date.parse(s))?null:s}
function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines){const chars=Array.from(text);let line='',lines=0;for(const c of chars){if(ctx.measureText(line+c).width>maxWidth&&line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=c;if(lines>=maxLines)return lines}else line+=c}if(line&&lines<maxLines){ctx.fillText(line,x,y+lines*lineHeight);lines++}return lines}
function makeCanvas(){const visible=dataRows(state.journalFilter,state.journalStatus),total=visible.length,rows=visible.slice(0,60);const w=900,top=240,rowH=88,h=Math.max(480,top+Math.max(1,rows.length)*rowH+100);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#f6f2e6';x.fillRect(0,0,w,h);x.fillStyle='#253348';x.font='bold 56px sans-serif';x.fillText('とっとりトリップ',60,100);x.font='24px sans-serif';x.fillText(new Date().toLocaleDateString('ja-JP'),62,150);x.fillText(`みつけた ${rows.filter(r=>r.seenAt).length}   すれ違い ${rows.filter(r=>r.nearAt).length}   訪れた ${rows.filter(r=>r.visitedAt).length}`,60,194);rows.forEach((r,i)=>{const y=top+i*rowH;x.fillStyle=i%2?'#f0ebdd':'#fffdf5';x.fillRect(45,y-12,w-90,rowH-4);x.fillStyle='#253348';x.font='bold 25px sans-serif';drawWrapped(x,r.place.name,60,y+23,650,26,1);x.font='20px sans-serif';x.fillStyle='#6b727b';x.fillText(`${rank(r)}  ${stamp(r.visitedAt||r.nearAt||r.seenAt)}`,62,y+56)});x.fillStyle='#253348';x.font='18px sans-serif';x.fillText(`TOTTORI TRIP  ·  OpenPOI API  ·  ${rows.length}/${total}件`,50,h-32);return c}
async function imageExport(){try{const c=makeCanvas();const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('png');const file=new File([blob],'tottori-trip.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'とっとりトリップ'});return}catch(err){if(err.name==='AbortError')return}}download(blob,'tottori-trip.png');toast('旅帖の画像を作成しました')}catch{toast('画像を作成できませんでした')}}
function openGoogle(){const p=state.selected;if(p)window.open(googleMapsLink(p),'_blank','noopener')}
function googleSearchLink(p){
 // Use the displayed facility name and its known locality, never just a generic
 // query or a coordinate; keep the search independent of the facility source.
 return 'https://www.google.com/search?q='+encodeURIComponent(
  [p.name,where(p)||'鳥取県'].filter(Boolean).join(' ')
 )
}
function openGoogleSearch(){
 const p=state.selected;
 if(p)window.open(googleSearchLink(p),'_blank','noopener')
}
function applyPreferences(){
 const pref=state.prefs;
 document.documentElement.dataset.tone=String(pref.tone);
 $('showOtherPlaces').checked=pref.showOther;
 document.querySelectorAll('[data-tone-choice]').forEach(b=>{
  const active=Number(b.dataset.toneChoice)===pref.tone;
  b.classList.toggle('active',active);
  b.setAttribute('aria-pressed',String(active))
 });
}
function updatePreferences(tone=state.prefs.tone){
 state.prefs={showOther:$('showOtherPlaces').checked,tone};
 applyPreferences();
 try{localStorage.setItem(UI_KEY,JSON.stringify(state.prefs))}
 catch{toast('表示設定を保存できませんでした')}
 renderList();
 if(state.tab==='journal')renderJournal()
}
function init(){applyPreferences();mapInit();
 $('settingsBtn').addEventListener('click',()=>$('settings').showModal());
 $('showOtherPlaces').addEventListener('change',()=>updatePreferences());
 document.querySelectorAll('[data-tone-choice]').forEach(b=>b.addEventListener('click',()=>updatePreferences(Number(b.dataset.toneChoice))));
 $('stats').addEventListener('click',e=>{const target=e.target.closest('[data-journal-status]');if(target)toggleJournalStatus(target.dataset.journalStatus)});$('area').addEventListener('change',resetArea);$('locateBtn').addEventListener('click',locate);$('trackBtn').addEventListener('click',toggleTracking);$('searchForm').addEventListener('submit',doSearch);$('search').addEventListener('input',onSearchInput);$('searchHereBtn').addEventListener('click',searchVisibleMap);$('literaryWorkMore').addEventListener('click',()=>{state.workShowAll=!state.workShowAll;renderLiteraryWorks()});document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>chooseFilter(b.dataset.filter)));$('placesTab').addEventListener('click',()=>showTab('places'));$('journalTab').addEventListener('click',()=>showTab('journal'));$('journalFilter').addEventListener('change',e=>setJournalFilter(e.target.value));$('visitBtn').addEventListener('click',()=>recordClick('visited'));$('nearBtn').addEventListener('click',()=>recordClick('near'));$('googleMapsBtn').addEventListener('click',openGoogle);$('googleSearchBtn').addEventListener('click',openGoogleSearch);$('viewOnMapBtn').addEventListener('click',viewOnMap);$('mapSourceBtn').addEventListener('click',changeMapProvider);$('mapRetryBtn').addEventListener('click',reloadMapTiles);$('mapFallbackRetryBtn').addEventListener('click',reloadMapTiles);$('infoBtn').addEventListener('click',()=>$('info').showModal());$('imageBtn').addEventListener('click',imageExport);$('printBtn').addEventListener('click',()=>{renderJournal();window.print()});$('backupBtn').addEventListener('click',backup);$('restoreFile').addEventListener('change',restore);$('journalCount').textContent=journalRows().length;renderList();fetchPlaces();}
if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});