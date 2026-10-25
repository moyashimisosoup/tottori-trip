/* とっとりトリップ: static, no build process; geolocation/diary data remain in the browser. */
'use strict';
const API='https://api.openpoiapi.com/v1/search';
const KEY='tottori-trip-v1';
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
const TYPES={sight:['✦','名所'],history:['▥','史跡'],temple:['社','寺社'],literature:['本','文学'],people:['★','偉人'],food:['食','飲食'],other:['・','施設']};
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
const state={area:'tottori',center:AREAS.tottori,filter:'all',query:'',places:[],results:[],journal:initial(),tab:'places',journalFilter:'all',selected:null,map:null,markers:null,gps:null,watch:null,tracking:false,lastFetch:0,lastLoc:null,toastTimer:0,loading:false};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state.journal))}catch{toast('保存できません。空き容量をご確認ください')}}
function idOf(p){return p.id||'poi:'+([p.source||'',p.name||'',Number(p.lat).toFixed(5),Number(p.lng).toFixed(5)].join('|'))}
function normalize(raw){if(!raw||!raw.name)return null;const lat=raw.lat===''||raw.lat==null?null:Number(raw.lat);const lng=raw.lng===''||raw.lng==null?null:Number(raw.lng);if(lat!==null&&(!Number.isFinite(lat)||lat < -90||lat>90))return null;if(lng!==null&&(!Number.isFinite(lng)||lng< -180||lng>180))return null;
 const p={name:String(raw.name).slice(0,130),lat,lng,address:String(raw.address||'').slice(0,180),category:String(raw.category||'unknown'),source:String(raw.source||'openpoi'),attributions:Array.isArray(raw.attributions)?raw.attributions.slice(0,15):[],licenses:Array.isArray(raw.licenses)?raw.licenses.slice(0,15):[],verified:true};p.id=idOf(p);p.type=classify(p);return p}
function isNightlifeName(name){
 return /ソープランド|ファッションヘルス|デリヘル|ホテヘル|ピンクサロン|キャバクラ|ホストクラブ|風俗店|メンズエステ|コンカフェ/.test(String(name||''))
}
function classify(p){
 if(p.type)return p.type==='adult'?'other':p.type;
 const n=String(p.name||'');
 if(/郵便局|郵便ポスト|〒|ゆうちょ|学校|保育園|幼稚園|交番|駐在所|市役所|役場|公民館/.test(n))return 'other';
 if(isNightlifeName(n))return 'other';
 if(/廃寺跡|寺院跡|旧寺跡/.test(n))return 'history';
 if(/神社|神宮|大社|神祠|観音堂|寺院|寺$|寺（|寺\(|投入堂|岩屋堂|仏閣/.test(n))return 'temple';
 if(/放哉|文学|文芸|歌碑|句碑|詩碑|小説|万葉|図書館/.test(n))return 'literature';
 if(/生誕|記念館|水木しげる|青山剛昌/.test(n))return 'people';
 if(/城跡|古墳|遺跡|史跡|石碑|旧居|文化財|台場跡|国庁跡|墓所|居館跡/.test(n))return 'history';
 if(['restaurant','cafe','fast_food','bakery','bar_izakaya'].includes(p.category))return 'food';
 if(/砂丘|海岸|海水浴場|渓谷|展望|公園|温泉|山岳|庭園|景勝|美術館|博物館|花回廊|街並|土蔵群|宿場町/.test(n))return 'sight';
 return 'other'
}
function effectiveType(p){
 const original=p.type==='adult'?'other':p.type;
 if(original==='history'&&classify({...p,type:null})==='temple')return 'temple';
 return original||'other'
}
function rad(n){return n*Math.PI/180}
function meters(a,b){if(!a||!b||a.lat==null||a.lng==null||b.lat==null||b.lng==null)return Infinity;const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),v=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)))}
function prettyDist(p){let n=meters(state.gps||state.center,p);if(!Number.isFinite(n))return '参考地点';return `${p.source==='guide'?'約':''}${n<1000?Math.round(n)+'m':(n/1000).toFixed(1)+'km'}`}
function where(p){return p.address||(p.source==='guide'?(AREAS[p.area]?.name||'鳥取県'):'')}
function toast(s){const el=$('toast');el.textContent=s;el.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.hidden=true,3000)}
function status(s,ok=false){$('gpsStatus').textContent=s;$('gpsDot').classList.toggle('on',ok);$('locateBtn').setAttribute('aria-pressed',String(ok))}
function eventFor(p,kind){const id=idOf(p);let row=state.journal[id];if(!row){row={id,place:{...p},seenAt:null,nearAt:null,visitedAt:null};state.journal[id]=row}if(!row[kind+'At'])row[kind+'At']=new Date().toISOString();row.place={...p};save();$('journalCount').textContent=Object.keys(state.journal).length;return row}
function rank(row){return row?.visitedAt?'訪れた':row?.nearAt?'すれ違った':row?.seenAt?'見つけた':''}
function showTab(tab){state.tab=tab;const on=tab==='places';$('placesPane').hidden=!on;$('journalPane').hidden=on;$('placesTab').classList.toggle('active',on);$('journalTab').classList.toggle('active',!on);$('placesTab').setAttribute('aria-pressed',String(on));$('journalTab').setAttribute('aria-pressed',String(!on));if(!on)renderJournal();else renderList();refreshMapSize(90)}
const LITERARY_BATCH_01=Array.isArray(window.TOTTORI_LITERARY_BATCH_01)?window.TOTTORI_LITERARY_BATCH_01:[];
const OFFICIAL_LANDMARKS=Array.isArray(window.TOTTORI_OFFICIAL_LANDMARKS)?window.TOTTORI_OFFICIAL_LANDMARKS:[];
function currentGuides(){
 return [
  ...GUIDES.filter(p=>p.area===state.area),
  ...CULTURE_SPOTS.filter(p=>p.area===state.area),
  ...LITERARY_BATCH_01.filter(p=>p.area===state.area),
  ...OFFICIAL_LANDMARKS.filter(p=>p.area===state.area),
  ...(state.area==='tottori'?HOSAI_MONUMENTS:[])
 ]
}
function allPlaces(){
 const items=new Map();
 for(const item of [...currentGuides(),...state.results]){
  if(isNightlifeName(item.name))continue;
  const nextType=effectiveType(item);
  const p=nextType===item.type?item:{...item,type:nextType};
  items.set(p.id,p)
 }
 return [...items.values()]
}
function matches(p){
 if(isNightlifeName(p.name)||state.filter!=='all'&&(effectiveType(p)!==state.filter&&!p.relatedTypes?.includes(state.filter)))return false;
 const term=state.query.trim().toLocaleLowerCase();
 if(term&&!(`${p.name} ${p.address||''} ${p.note||''}`).toLocaleLowerCase().includes(term))return false;
 // Region centers only decide whether an unlocated reference should appear
 // in the nearby list. They are NOT map pins or GPS proximity evidence.
 if(p.referenceArea&&!term){
  const c=state.map?.getCenter()||state.center;
  if(meters(c,p.referenceArea)>(p.referenceArea.radius||6000))return false;
 }
 return true
}
function filtered(){
 const bounds=state.map?.getBounds();
 const center=state.map?.getCenter()||state.center;
 const visible=state.places.filter(p=>matches(p)&&
  (p.lat==null||p.lng==null||!bounds?.isValid()||bounds.contains([p.lat,p.lng])));
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
 const q=$('search').value.trim();
 fetchPlaces(q)
}
function badgeHTML(label,kind){return '<span class="badge badge-'+kind+'">'+q(label)+'</span>'}
function positionBadge(p){return p.lat==null||p.lng==null?(p.source==='official-tourism'?'所在地資料のみ':p.address?'住所のみ':'位置なし'):p.verified===false?'概略位置':p.source==='tottori-city-poi'?'公式座標':'位置あり'}
function badgesFor(p,row){
 const parts=[badgeHTML((TYPES[effectiveType(p)]||TYPES.other)[1],'type')];
 if(p.relatedTypes?.includes('people'))parts.push(badgeHTML('偉人','type'));
 const pos=positionBadge(p);
 parts.push(badgeHTML(pos,p.source==='guide'?'reference':'geo'));
 if(row?.visitedAt)parts.push(badgeHTML('訪問済','visited'));
 else if(row?.nearAt)parts.push(badgeHTML('すれ違い','near'));
 else if(row?.seenAt)parts.push(badgeHTML('発見','seen'));
 return '<span class="badges">'+parts.join('')+'</span>';
}

const PIXEL_ICONS={
 scroll:'<path fill="#9ebf77" d="M2 2h3v2h6V2h3v12h-3v-2H5v2H2z"/><path fill="#fff3dc" d="M5 4h6v8H5z"/><path fill="#26334a" d="M6 6h4v1H6zm0 2h4v1H6zm1 2h3v1H7z"/>',
 book:'<path fill="#b592c3" d="M1 3h6l1 2 1-2h6v11H9l-1 1-1-1H1z"/><path fill="#fff3dc" d="M2 4h5v8H2zm7 0h5v8H9z"/><path fill="#527aa3" d="M3 6h3v1H3zm0 2h3v1H3zm7-2h3v1h-3zm0 2h3v1h-3z"/>',
 bust:'<path fill="#7ea4c6" d="M6 2h4v1h2v5h-2v2h2l2 3v2H2v-2l2-3h2V8H4V3h2z"/><path fill="#f6e6c7" d="M5 4h6v4H5z"/><path fill="#26334a" d="M6 5h1v1H6zm3 0h1v1H9z"/>',
 temple:'<path fill="#314e76" d="M7 1h2v2h3v2h2v2H2V5h2V3h3z"/><path fill="#fff3dc" d="M3 7h10v7H3z"/><path fill="#bd9366" d="M4 8h8v1H4zm0 5h8v1H4z"/><path fill="#26334a" d="M6 9h4v4H6z"/>',
 torii:'<path fill="#df786a" d="M2 2h12v2H2zm1 3h10v2H3zm2 2h2v8H5zm4 0h2v8H9z"/><path fill="#efc767" d="M7 5h2v2H7z"/>',
 castle:'<path fill="#26334a" d="M6 1h4v2h3v3h2v9H1V6h2V3h3z"/><path fill="#8bb0c8" d="M4 5h8v3H4z"/><path fill="#fff3dc" d="M3 9h10v5H3z"/><path fill="#26334a" d="M7 10h2v4H7z"/>',
 post:'<path fill="#26334a" d="M1 3h14v11H1z"/><path fill="#fff3dc" d="M2 4h12v9H2z"/><path fill="#e88d7d" d="M3 5h10v2H3z"/><path fill="#26334a" d="M3 8l5 3 5-3v1l-5 4-5-4z"/>',
 food:'<path fill="#26334a" d="M1 7h14v4l-3 3H4l-3-3z"/><path fill="#e88d7d" d="M2 8h12v3H2z"/><path fill="#fff3dc" d="M5 3h2v4H5zm4-2h2v6H9z"/><path fill="#9bbf72" d="M6 8h4v2H6z"/>',
 night:'<path fill="#f0c35b" d="M9 1h3v2h-2v7H9V1zM4 4h5v8H4l-2-4z"/><path fill="#d3e4ea" d="M13 5h2v2h-2zm-9-3h1v1H4z"/>',
 tree:'<path fill="#8fc06b" d="M6 1h4v2h3v6h-3v2H4V9H2V4h4z"/><path fill="#a77951" d="M7 10h3v5H7z"/>',
 museum:'<path fill="#314e76" d="M1 5h14v2H1zM8 1l7 4H1z"/><path fill="#fff3dc" d="M2 7h12v6H2z"/><path fill="#7ea4c6" d="M4 7h2v6H4zm3 0h2v6H7zm3 0h2v6h-2z"/><path fill="#314e76" d="M1 13h14v2H1z"/>',
 building:'<path fill="#314e76" d="M3 1h10v14H3z"/><path fill="#fff3dc" d="M4 3h8v11H4z"/><path fill="#7ea4c6" d="M5 4h2v2H5zm4 0h2v2H9zM5 8h2v2H5zm4 0h2v2H9z"/>'
};
function iconKind(p){
 const n=String(p.name||'');
 if(/郵便局|郵便ポスト|ゆうちょ/.test(n))return 'post';
 if(/神社|神宮|大社/.test(n))return 'torii';
 if(/寺院|寺$|寺（|寺\(/.test(n))return 'temple';
 if(/城跡|城址|城郭/.test(n))return 'castle';
 if(/図書館|文庫/.test(n))return 'book';
 if(/歌碑|句碑|文学の小径|詩碑|文学/.test(n))return 'scroll';
 if(/記念館|資料館|博物館|歴史館|美術館/.test(n))return p.type==='people'?'bust':'museum';
 if(p.type==='people')return 'bust';
 if(p.type==='literature')return 'scroll';
 if(p.type==='food')return 'food';
 if(effectiveType(p)==='temple')return 'temple';
 if(p.type==='sight'&&/森|公園|山|砂丘|自然/.test(n))return 'tree';
 if(p.type==='history')return 'museum';
 return 'building'
}
function pixelIcon(p){
 const kind=iconKind(p);
 return '<svg class="pixel-art" viewBox="0 0 16 16" width="30" height="30" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'+PIXEL_ICONS[kind]+'</svg>'
}

function fillPlaceCard(place,row){const btn=document.createElement('button');btn.className='place-card';btn.type='button';btn.dataset.id=place.id;const [,label]=TYPES[place.type]||TYPES.other;btn.innerHTML=`<span class="symbol" aria-hidden="true">${pixelIcon(place)}</span><span class="content"><span class="name">${q(place.name)}</span>${badgesFor(place,row)}<span class="minor">${q(prettyDist(place))}</span></span><span class="arrow" aria-hidden="true">›</span>`;btn.addEventListener('click',()=>openDetail(place));return btn}
function renderList(){state.places=allPlaces();let list=filtered();$('placesCount').textContent=list.length;$('places').replaceChildren(...list.map(p=>fillPlaceCard(p,state.journal[p.id])));if(!state.loading)$('message').textContent=list.length?`${list.length}か所`: 'この条件の場所はありません。エリアやジャンルを変えてください。';drawMarkers(list)}
function renderJournal(){
 const all=Object.values(state.journal).filter(row=>row&&row.place);
 const selection=state.journalFilter;
 const rows=all.filter(row=>selection==='all'||
  effectiveType(row.place)===selection||row.place.relatedTypes?.includes(selection))
  .sort((a,b)=>new Date(b.visitedAt||b.nearAt||b.seenAt||0)-new Date(a.visitedAt||a.nearAt||a.seenAt||0));
 $('journalCount').textContent=all.length;
 $('journalShownCount').textContent=rows.length+'件';
 $('stats').innerHTML=[['みつけた',rows.filter(r=>r.seenAt).length],
  ['すれ違い',rows.filter(r=>r.nearAt).length],
  ['訪れた',rows.filter(r=>r.visitedAt).length]]
  .map(([k,v])=>`<div class="stat"><b>${v}</b><small>${k}</small></div>`).join('');
 $('journal').replaceChildren(...(rows.length?rows.map(r=>fillPlaceCard(r.place,r)):
  [Object.assign(document.createElement('div'),{className:'empty',
   textContent:all.length?'このジャンルの記録はまだありません。':'旅の記録はまだありません。'})]));
}
function setJournalFilter(category){
 state.journalFilter=['all','sight','history','temple','literature','people','food','other'].includes(category)?category:'all';
 renderJournal()
}
function markerCategory(p){
 // A dual-classified literary landmark is a people marker while the people
 // filter is active; otherwise it keeps its primary category in "all".
 if(state.filter!=='all'&&(p.type===state.filter||p.relatedTypes?.includes(state.filter)))
  return state.filter;
 return TYPES[effectiveType(p)]?effectiveType(p):'other'
}
function drawMarkers(list){
 if(!state.map||!window.L)return;
 state.markers.clearLayers();
 for(const p of list){
  if(p.lat==null||p.lng==null)continue;
  const icon=L.divIcon({
   className:'',
   html:`<div class="pixel-pin c-${markerCategory(p)}"></div>`,
   iconSize:[22,22],iconAnchor:[11,11]
  });
  const marker=L.marker([p.lat,p.lng],{icon});
  marker.on('click',()=>openDetail(p));
  marker.addTo(state.markers)
 }
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
 const name=AREAS[state.area]?.name||'現在地';
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
function viewOnMap(){
 const p=state.selected;
 if(!p||p.lat==null||p.lng==null){toast('地図位置が未登録の参考地点です');return}
 $('detail').close();
 if(state.tab==='journal')showTab('places');
 if(!state.map){window.open(googleMapsLink(p),'_blank','noopener');return}
 if(state.focusMarker)state.map.removeLayer(state.focusMarker);
 state.map.setView([p.lat,p.lng],Math.max(15,state.map.getZoom()),{animate:false});
 const icon=L.divIcon({className:'',html:'<div class="pixel-pin c-'+markerCategory(p)+' focus-pin"></div>',iconSize:[28,28],iconAnchor:[14,14]});
 state.focusMarker=L.marker([p.lat,p.lng],{icon,zIndexOffset:1000}).addTo(state.map);
 $('mapFallbackLink').href=googleMapsLink(p);$('mapNoticeLink').href=googleMapsLink(p);
 document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
 refreshMapSize(160)
}
function updateMap(){const c=state.center;mapStamp();if(state.map){if(state.focusMarker){state.map.removeLayer(state.focusMarker);state.focusMarker=null}state.map.setView([c.lat,c.lng],16);refreshMapSize(100)}$('mapFallbackLink').href=googleMapsLink(c);$('mapNoticeLink').href=googleMapsLink(c);renderList()}
let reqSeq=0;
async function fetchPlaces(extra=''){
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
  if(extra)qs.set('q',extra);const controller=new AbortController();const tm=setTimeout(()=>controller.abort(),11000);let response;try{response=await fetch(`${API}?${qs}`,{signal:controller.signal})}finally{clearTimeout(tm)}if(!response.ok)throw new Error('HTTP '+response.status);const json=await response.json();if(seq!==reqSeq)return;state.results=(Array.isArray(json.results)?json.results:[]).map(normalize).filter(Boolean).filter(p=>!isNightlifeName(p.name));state.lastFetch=Date.now();}catch(err){if(seq!==reqSeq)return;state.results=[];$('message').textContent='施設データが読み込めません。参考スポットのみ表示します。';console.warn('OpenPOI search unavailable',err)}finally{if(seq===reqSeq){state.loading=false;renderList();updateSearchHereButton();checkNear()}}}
function openDetail(p){
 state.selected=p;const row=eventFor(p,'seen');
 $('detailType').textContent=(TYPES[effectiveType(p)]||TYPES.other)[1];
 $('detailName').textContent=p.name;
 $('detailMeta').textContent=[where(p),prettyDist(p)].filter(Boolean).join(' · ');
 $('detailNote').textContent=p.note||'気になったら、旅帖に残しておきましょう。';
 const curated=String(p.id||'').startsWith('culture:')||String(p.id||'').startsWith('night:')||p.source==='curated';
 const sourceLabel=p.source==='tottori-city-poi'?'鳥取市オープンデータ':p.source==='official-tourism'?'とっとり旅（公式）':p.source==='guide'?'観光・施設資料':curated||p.source==='reference'?'公開資料':'OpenPOI API';
 const sourceURL=p.source==='tottori-city-poi'?HOSAI_DATASET:curated||p.source==='reference'||p.source==='guide'||p.source==='official-tourism'?p.url:null;
 const safeSource=sourceURL&&/^https:\/\//.test(sourceURL)?'<a class="detail-source" href="'+q(sourceURL)+'" target="_blank" rel="noopener noreferrer">'+sourceLabel+' ↗</a>':'<small class="detail-source">'+sourceLabel+'</small>';
 $('detailTags').innerHTML=badgesFor(p,row)+safeSource+(p.verified===false?'<small class="detail-source">参考地点・自動すれ違い対象外</small>':'');
 $('viewOnMapBtn').disabled=p.lat==null||p.lng==null;
 $('visitBtn').textContent=row.visitedAt?'✓ 訪問済':'✓ 訪れた';
 $('visitBtn').setAttribute('aria-label',row.visitedAt?'訪問を記録済み':'訪問を記録');
 $('nearBtn').textContent=row.nearAt?'◇ 記録済':'◇ すれ違い';
 $('nearBtn').setAttribute('aria-label',row.nearAt?'すれ違いを記録済み':'すれ違いを記録');
 $('detail').showModal();renderList()
}
function recordClick(kind){const p=state.selected;if(!p)return;eventFor(p,kind);toast(kind==='visited'?'訪問を旅帖に追加しました':'すれ違いを記録しました');$('detail').close();renderList();if(state.tab==='journal')renderJournal()}
function isTottori(p){return p.lat>=35.0&&p.lat<=35.65&&p.lng>=133.11&&p.lng<=134.58}
function locationFailure(err){status(err?.code===1?'位置情報が拒否されました':'現在地を取得できません');toast('位置情報の設定をご確認ください')}
function onLocation(pos,recenter){const p={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};const inPref=isTottori(p);state.gps=inPref?p:null;status(inPref?`現在地を取得 · 精度 約${Math.round(p.accuracy)}m`:'鳥取県外 · 鳥取のスポットを表示',inPref);if(recenter){if(!inPref){toast('現在地は鳥取県外です。鳥取のエリアを表示します');renderList();return}state.center={lat:p.lat,lng:p.lng};const ks=Object.keys(AREAS);state.area=ks.reduce((a,b)=>meters(p,AREAS[b])<meters(p,AREAS[a])?b:a);$('area').value=state.area;updateMap();fetchPlaces()}else{drawMarkers(filtered());if(!inPref)return;checkNear();if(state.tracking&&(!state.lastLoc||meters(p,state.lastLoc)>300)&&Date.now()-state.lastFetch>60000){state.center={lat:p.lat,lng:p.lng};state.lastLoc=p;updateMap();fetchPlaces()}}}
function locate(){if(!navigator.geolocation){toast('この端末では現在地を取得できません');return}status('現在地を確認中…');navigator.geolocation.getCurrentPosition(p=>onLocation(p,true),locationFailure,{enableHighAccuracy:true,timeout:12000,maximumAge:15000})}
function checkNear(){if(!state.tracking||!state.gps||state.gps.accuracy>80)return;let found=0;for(const p of [...state.results,...currentGuides().filter(g=>g.verified===true&&g.type!=='adult')]){if(p.verified===false||p.lat==null||p.lng==null)continue;const d=meters(state.gps,p);if(d<=160&&!state.journal[p.id]?.nearAt){eventFor(p,'near');found++}}if(found){toast(`${found}か所とすれ違いました`);renderList();if(state.tab==='journal')renderJournal()}}
function toggleTracking(){if(state.tracking){navigator.geolocation.clearWatch(state.watch);state.watch=null;state.tracking=false;$('trackBtn').textContent='◇ すれ違い OFF';$('trackBtn').setAttribute('aria-pressed','false');return}if(!navigator.geolocation){toast('位置情報が使えません');return}state.tracking=true;$('trackBtn').textContent='◆ すれ違い ON';$('trackBtn').setAttribute('aria-pressed','true');state.watch=navigator.geolocation.watchPosition(p=>onLocation(p,false),err=>{locationFailure(err);toggleTracking()},{enableHighAccuracy:true,maximumAge:10000,timeout:20000})}
function chooseFilter(f){
 if(f!=='all'&&!TYPES[f])return;
 state.filter=f;
 for(const b of document.querySelectorAll('[data-filter]')){
  const on=b.dataset.filter===f;
  b.classList.toggle('active',on);
  b.setAttribute('aria-pressed',String(on))
 }
 if(!state.results.length||!state.lastFetch)fetchPlaces();
 else renderList()
}
function resetArea(){const a=AREAS[$('area').value];state.area=$('area').value;state.center={lat:a.lat,lng:a.lng};state.gps=null;status(a.name+'の地図 · 現在地未取得');state.query='';$('search').value='';state.lastQuery='';updateMap();fetchPlaces()}
function doSearch(ev){ev.preventDefault();state.query=$('search').value.trim();if(state.query){state.filter='all';for(const b of document.querySelectorAll('[data-filter]')){b.classList.toggle('active',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'))}const query=state.query;state.query='';fetchPlaces(query).then(()=>{state.query='';renderList()})}else fetchPlaces()}
function dataRows(category='all'){return Object.values(state.journal).filter(v=>v&&v.place&&(category==='all'||effectiveType(v.place)===category||v.place.relatedTypes?.includes(category))).sort((a,b)=>new Date(a.seenAt||a.nearAt||a.visitedAt||0)-new Date(b.seenAt||b.nearAt||b.visitedAt||0))}
function stamp(d){if(!d)return '';const v=new Date(d);return Number.isNaN(v.getTime())?'':new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(v)}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function backup(){const payload={app:'とっとりトリップ',version:1,exportedAt:new Date().toISOString(),entries:dataRows()};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'tottori-trip-backup.json');toast('バックアップを作成しました')}
async function restore(ev){const file=ev.target.files?.[0];ev.target.value='';if(!file)return;if(file.size>3000000){toast('ファイルが大きすぎます');return}try{const data=JSON.parse(await file.text());if(data.app!=='とっとりトリップ'||!Array.isArray(data.entries)||data.entries.length>3000)throw Error('invalid file');let count=0;for(const row of data.entries){if(!row||typeof row.id!=='string'||row.id.length>220||typeof row.place?.name!=='string'||row.place.name.length>150)continue;const p=row.place;const safe={id:row.id,name:p.name.slice(0,130),type:Object.hasOwn(TYPES,p.type)?p.type:'other',lat:Number.isFinite(Number(p.lat))&&p.lat!==null?Number(p.lat):null,lng:Number.isFinite(Number(p.lng))&&p.lng!==null?Number(p.lng):null,address:String(p.address||'').slice(0,180),note:String(p.note||'').slice(0,400),source:String(p.source||''),verified:p.verified===true,licenses:Array.isArray(p.licenses)?p.licenses.slice(0,15):[],attributions:Array.isArray(p.attributions)?p.attributions.slice(0,15):[]};state.journal[row.id]={id:row.id,place:safe,seenAt:safeDate(row.seenAt),nearAt:safeDate(row.nearAt),visitedAt:safeDate(row.visitedAt)};count++}save();renderJournal();toast(`${count}件を復元しました`)}catch{toast('復元できないJSONファイルです')}}
function safeDate(s){if(typeof s!=='string'||s.length>40)return null;return Number.isNaN(Date.parse(s))?null:s}
function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines){const chars=Array.from(text);let line='',lines=0;for(const c of chars){if(ctx.measureText(line+c).width>maxWidth&&line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=c;if(lines>=maxLines)return lines}else line+=c}if(line&&lines<maxLines){ctx.fillText(line,x,y+lines*lineHeight);lines++}return lines}
function makeCanvas(){const visible=dataRows(state.journalFilter),total=visible.length,rows=visible.slice(0,60);const w=900,top=240,rowH=88,h=Math.max(480,top+Math.max(1,rows.length)*rowH+100);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#f6f2e6';x.fillRect(0,0,w,h);x.fillStyle='#253348';x.font='bold 56px sans-serif';x.fillText('とっとりトリップ',60,100);x.font='24px sans-serif';x.fillText(new Date().toLocaleDateString('ja-JP'),62,150);x.fillText(`みつけた ${rows.filter(r=>r.seenAt).length}   すれ違い ${rows.filter(r=>r.nearAt).length}   訪れた ${rows.filter(r=>r.visitedAt).length}`,60,194);rows.forEach((r,i)=>{const y=top+i*rowH;x.fillStyle=i%2?'#f0ebdd':'#fffdf5';x.fillRect(45,y-12,w-90,rowH-4);x.fillStyle='#253348';x.font='bold 25px sans-serif';drawWrapped(x,r.place.name,60,y+23,650,26,1);x.font='20px sans-serif';x.fillStyle='#6b727b';x.fillText(`${rank(r)}  ${stamp(r.visitedAt||r.nearAt||r.seenAt)}`,62,y+56)});x.fillStyle='#253348';x.font='18px sans-serif';x.fillText(`TOTTORI TRIP  ·  OpenPOI API  ·  ${rows.length}/${total}件`,50,h-32);return c}
async function imageExport(){try{const c=makeCanvas();const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('png');const file=new File([blob],'tottori-trip.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'とっとりトリップ'});return}catch(err){if(err.name==='AbortError')return}}download(blob,'tottori-trip.png');toast('旅帖の画像を作成しました')}catch{toast('画像を作成できませんでした')}}
function openGoogle(){const p=state.selected;if(p)window.open(googleMapsLink(p),'_blank','noopener')}
function init(){mapInit();$('area').addEventListener('change',resetArea);$('locateBtn').addEventListener('click',locate);$('trackBtn').addEventListener('click',toggleTracking);$('searchForm').addEventListener('submit',doSearch);$('searchHereBtn').addEventListener('click',searchVisibleMap);document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>chooseFilter(b.dataset.filter)));$('placesTab').addEventListener('click',()=>showTab('places'));$('journalTab').addEventListener('click',()=>showTab('journal'));$('journalFilter').addEventListener('change',e=>setJournalFilter(e.target.value));$('visitBtn').addEventListener('click',()=>recordClick('visited'));$('nearBtn').addEventListener('click',()=>recordClick('near'));$('googleMapsBtn').addEventListener('click',openGoogle);$('viewOnMapBtn').addEventListener('click',viewOnMap);$('mapSourceBtn').addEventListener('click',changeMapProvider);$('mapRetryBtn').addEventListener('click',reloadMapTiles);$('mapFallbackRetryBtn').addEventListener('click',reloadMapTiles);$('infoBtn').addEventListener('click',()=>$('info').showModal());$('imageBtn').addEventListener('click',imageExport);$('printBtn').addEventListener('click',()=>{renderJournal();window.print()});$('backupBtn').addEventListener('click',backup);$('restoreFile').addEventListener('change',restore);$('journalCount').textContent=Object.keys(state.journal).length;renderList();fetchPlaces();}
if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});