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
 {name:'白兎神社',type:'history',lat:35.5231,lng:134.1149,area:'tottori',note:'因幡の白うさぎの神話にゆかりのある神社。',url:'https://www.torican.jp/en/spot/detail_1003.html',verified:false},
 {name:'鳥取城跡',type:'history',lat:35.5117,lng:134.2406,area:'tottori',note:'久松山の麓に残る鳥取城の史跡。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'仁風閣',type:'history',lat:35.5103,lng:134.2387,area:'tottori',note:'鳥取城跡の近くにある洋風建築。',url:'https://www.pref.tottori.lg.jp/260655.htm',verified:false},
 {name:'尾崎放哉の句碑',type:'literature',lat:null,lng:null,area:'tottori',address:'鳥取市立川町1丁目',note:'自由律俳句の俳人、尾崎放哉の句碑。',url:'https://www.pref.tottori.lg.jp/dd.aspx?menuid=73376',verified:false},
 {name:'尾崎放哉生誕の地',type:'people',lat:null,lng:null,area:'tottori',address:'鳥取市吉方町2丁目',note:'鳥取出身の俳人、尾崎放哉の生誕地。',url:'https://www.pref.tottori.lg.jp/dd.aspx?menuid=73376',verified:false},
 {name:'倉吉白壁土蔵群',type:'history',lat:35.4333,lng:133.8249,area:'kurayoshi',note:'白壁の土蔵が並ぶ歴史的な町並み。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'三朝温泉',type:'sight',lat:35.4083,lng:133.8941,area:'kurayoshi',note:'三徳川沿いに広がる温泉街。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'青山剛昌ふるさと館',type:'people',lat:35.4944,lng:133.7570,area:'kurayoshi',note:'漫画家・青山剛昌の故郷にある記念施設。',url:'https://www.pref.tottori.lg.jp/260655.htm',verified:false},
 {name:'水木しげるロード',type:'people',lat:35.5424,lng:133.2297,area:'sakaiminato',note:'水木しげるゆかりの境港の通り。',url:'https://www.pref.tottori.lg.jp/260655.htm',verified:false},
 {name:'水木しげる記念館',type:'people',lat:35.5430,lng:133.2248,area:'sakaiminato',note:'漫画家・水木しげるを紹介する記念館。',url:'https://www.pref.tottori.lg.jp/260655.htm',verified:false},
 {name:'大山',type:'sight',lat:35.3710,lng:133.5465,area:'yonago',note:'伯耆富士とも呼ばれる鳥取の名峰。',url:'https://www.tottori-guide.jp/',verified:false},
 {name:'皆生温泉',type:'sight',lat:35.4574,lng:133.3628,area:'yonago',note:'日本海に面した温泉地。',url:'https://www.tottori-guide.jp/',verified:false}
].map((p,i)=>({...p,id:'guide:'+i,source:'guide',licenses:[],attributions:[],category:p.type}));

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

const $=id=>document.getElementById(id);
const TYPES={sight:['✦','名所'],history:['▥','史跡'],literature:['本','文学'],people:['★','偉人'],food:['食','飲食'],adult:['夜','風俗'],other:['・','施設']};
const q=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initial=()=>{try{const obj=JSON.parse(localStorage.getItem(KEY)||'{}');return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{}}catch{return {}}};
const state={area:'tottori',center:AREAS.tottori,filter:'all',query:'',places:[],results:[],journal:initial(),tab:'places',selected:null,map:null,markers:null,gps:null,watch:null,tracking:false,adultOK:false,lastFetch:0,lastLoc:null,toastTimer:0,loading:false};
function save(){try{localStorage.setItem(KEY,JSON.stringify(state.journal))}catch{toast('保存できません。空き容量をご確認ください')}}
function idOf(p){return p.id||'poi:'+([p.source||'',p.name||'',Number(p.lat).toFixed(5),Number(p.lng).toFixed(5)].join('|'))}
function normalize(raw){if(!raw||!raw.name)return null;const lat=raw.lat===''||raw.lat==null?null:Number(raw.lat);const lng=raw.lng===''||raw.lng==null?null:Number(raw.lng);if(lat!==null&&(!Number.isFinite(lat)||lat < -90||lat>90))return null;if(lng!==null&&(!Number.isFinite(lng)||lng< -180||lng>180))return null;
 const p={name:String(raw.name).slice(0,130),lat,lng,address:String(raw.address||'').slice(0,180),category:String(raw.category||'unknown'),source:String(raw.source||'openpoi'),attributions:Array.isArray(raw.attributions)?raw.attributions.slice(0,15):[],licenses:Array.isArray(raw.licenses)?raw.licenses.slice(0,15):[],verified:true};p.id=idOf(p);p.type=classify(p);return p}
function classify(p){if(p.type)return p.type;const n=(p.name||'');if(/ソープランド|ファッションヘルス|デリヘル|ホテヘル|ピンクサロン|セクシーキャバクラ|キャバクラ|ホストクラブ|メンズエステ|大人の社交|風俗店/.test(n))return 'adult';if(/放哉|文学|文芸|歌碑|句碑|詩碑|小説/.test(n))return 'literature';if(/生誕|記念館|水木しげる|青山剛昌/.test(n))return 'people';if(/城跡|古墳|遺跡|史跡|寺|神社|神宮|石碑|旧居|文化財/.test(n))return 'history';if(['restaurant','cafe','fast_food','bakery','bar_izakaya'].includes(p.category))return 'food';if(p.category==='tourism'||/砂丘|博物館|美術館|景勝|展望|公園|温泉/.test(n))return 'sight';return 'other'}
function rad(n){return n*Math.PI/180}
function meters(a,b){if(!a||!b||a.lat==null||a.lng==null||b.lat==null||b.lng==null)return Infinity;const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),v=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)))}
function prettyDist(p){let n=meters(state.gps||state.center,p);if(!Number.isFinite(n))return '参考地点';return `${p.source==='guide'?'約':''}${n<1000?Math.round(n)+'m':(n/1000).toFixed(1)+'km'}`}
function where(p){return p.address||(p.source==='guide'?(AREAS[p.area]?.name||'鳥取県'):'')}
function toast(s){const el=$('toast');el.textContent=s;el.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.hidden=true,3000)}
function status(s,ok=false){$('gpsStatus').textContent=s;$('gpsDot').classList.toggle('on',ok)}
function eventFor(p,kind){const id=idOf(p);let row=state.journal[id];if(!row){row={id,place:{...p},seenAt:null,nearAt:null,visitedAt:null};state.journal[id]=row}if(!row[kind+'At'])row[kind+'At']=new Date().toISOString();row.place={...p};save();$('journalCount').textContent=Object.keys(state.journal).length;return row}
function rank(row){return row?.visitedAt?'訪れた':row?.nearAt?'すれ違った':row?.seenAt?'見つけた':''}
function showTab(tab){state.tab=tab;const on=tab==='places';$('placesPane').hidden=!on;$('journalPane').hidden=on;$('placesTab').classList.toggle('active',on);$('journalTab').classList.toggle('active',!on);$('placesTab').setAttribute('aria-pressed',String(on));$('journalTab').setAttribute('aria-pressed',String(!on));if(!on)renderJournal();else renderList();refreshMapSize(90)}
function currentGuides(){return GUIDES.filter(p=>p.area===state.area).concat(state.area==='tottori'?HOSAI_MONUMENTS:[])}
function allPlaces(){const items=new Map();for(const p of [...currentGuides(),...state.results])items.set(p.id,p);return [...items.values()]}
function matches(p){if(state.filter!=='all'&&p.type!==state.filter&&!p.relatedTypes?.includes(state.filter))return false;const term=state.query.trim().toLocaleLowerCase();if(term&&!`${p.name} ${p.address||''} ${p.note||''}`.toLocaleLowerCase().includes(term))return false;return true}
function filtered(){return state.places.filter(matches).sort((a,b)=>meters(state.center,a)-meters(state.center,b)).slice(0,70)}
function badgeHTML(label,kind){return '<span class="badge badge-'+kind+'">'+q(label)+'</span>'}
function positionBadge(p){return p.lat==null||p.lng==null?'位置なし':p.source==='guide'?'概略位置':p.source==='tottori-city-poi'?'公式座標':'位置あり'}
function badgesFor(p,row){
 const parts=[badgeHTML((TYPES[p.type]||TYPES.other)[1],'type')];
 if(p.relatedTypes?.includes('people'))parts.push(badgeHTML('偉人','type'));
 const pos=positionBadge(p);
 parts.push(badgeHTML(pos,p.source==='guide'?'reference':'geo'));
 if(row?.visitedAt)parts.push(badgeHTML('訪問済','visited'));
 else if(row?.nearAt)parts.push(badgeHTML('すれ違い','near'));
 else if(row?.seenAt)parts.push(badgeHTML('発見','seen'));
 return '<span class="badges">'+parts.join('')+'</span>';
}
function fillPlaceCard(place,row){const btn=document.createElement('button');btn.className='place-card';btn.type='button';btn.dataset.id=place.id;const [icon,label]=TYPES[place.type]||TYPES.other;btn.innerHTML=`<span class="symbol" aria-hidden="true">${q(icon)}</span><span class="content"><span class="name">${q(place.name)}</span>${badgesFor(place,row)}<span class="minor">${q(prettyDist(place))}</span></span><span class="arrow" aria-hidden="true">›</span>`;btn.addEventListener('click',()=>openDetail(place));return btn}
function renderList(){state.places=allPlaces();let list=filtered();$('placesCount').textContent=list.length;$('places').replaceChildren(...list.map(p=>fillPlaceCard(p,state.journal[p.id])));if(!state.loading)$('message').textContent=list.length?`${list.length}か所`: 'この条件の場所はありません。エリアやジャンルを変えてください。';drawMarkers(list)}
function renderJournal(){let rows=Object.values(state.journal).filter(row=>row&&row.place).sort((a,b)=>new Date(b.visitedAt||b.nearAt||b.seenAt||0)-new Date(a.visitedAt||a.nearAt||a.seenAt||0));$('journalCount').textContent=rows.length;$('stats').innerHTML=[['みつけた',rows.filter(r=>r.seenAt).length],['すれ違い',rows.filter(r=>r.nearAt).length],['訪れた',rows.filter(r=>r.visitedAt).length]].map(([k,v])=>`<div class="stat"><b>${v}</b><small>${k}</small></div>`).join('');$('journal').replaceChildren(...(rows.length?rows.map(r=>fillPlaceCard(r.place,r)):[Object.assign(document.createElement('div'),{className:'empty',textContent:'旅の記録はまだありません。'})]));}
function drawMarkers(list){if(!state.map||!window.L)return;state.markers.clearLayers();for(const p of list){if(p.lat==null||p.lng==null)continue;const icon=L.divIcon({className:'',html:`<div class="pixel-pin c-${p.type}"></div>`,iconSize:[22,22],iconAnchor:[11,11]});const marker=L.marker([p.lat,p.lng],{icon});marker.on('click',()=>openDetail(p));marker.addTo(state.markers)}if(state.gps){L.circleMarker([state.gps.lat,state.gps.lng],{radius:6,color:'#fff',weight:3,fillColor:'#276c98',fillOpacity:1}).addTo(state.markers)}}
// One active provider at a time. GSI is the default for Tottori; OSM is a
// fallback, never fetched in parallel. The visible viewport alone is requested.
const MAP_PROVIDERS={
 gsi:{label:'地理院',url:'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',native:18,credit:'&copy; <a href="https://maps.gsi.go.jp/">国土地理院</a>'},
 osm:{label:'OSM',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',native:19,credit:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
};
// Recover each map tile independently: a single failed tile must not discard
// the other successfully loaded tiles. OpenPOI supplies locations, not imagery.
let mapResizeTimer=null,mapBaseLayer=null,mapProvider='gsi',mapGeneration=0;
let mapTileStats={requested:0,ok:0,alternate:0,failed:0,finished:0};
const EMPTY_TILE='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(
 '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#e5e7db"/><path d="M0 0H256V256H0Z" fill="none" stroke="#c6cabb" stroke-width="2"/><path d="M108 124h40m-20-20v40" stroke="#b7bcad" stroke-width="3"/></svg>'
);
function refreshMapSize(delay=90){
 if(!state.map)return;
 clearTimeout(mapResizeTimer);
 mapResizeTimer=setTimeout(()=>{if(state.map)state.map.invalidateSize({pan:false,animate:false})},delay)
}
function mapStamp(label=''){
 const name=AREAS[state.area]?.name||'現在地';
 $('mapStamp').textContent=name+' · '+(label||MAP_PROVIDERS[mapProvider].label);
}
function googleMapsLink(p){
 const param=p.lat!=null&&p.lng!=null?(p.lat+','+p.lng):[p.name,where(p)].filter(Boolean).join(' ');
 return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(param)
}
function showMapFailure(){
 $('mapFallback').hidden=false;
 mapStamp('読込不可');
 $('mapFallbackLink').href=googleMapsLink(state.map?state.map.getCenter():state.center);
}
function updateMapTileStatus(gen){
 if(gen!==mapGeneration)return;
 const stat=mapTileStats;
 const unavailable=stat.failed>0;
 $('mapNotice').hidden=!unavailable;
 if(unavailable)$('mapNoticeText').textContent='地図の一部が取得できません ('+stat.failed+'枚)';
 $('mapNoticeLink').href=googleMapsLink(state.map?state.map.getCenter():state.center);
 if(stat.alternate>0&&!unavailable)mapStamp('地理院＋OSM');
 else mapStamp();
 if(stat.finished===stat.requested&&stat.requested>0&&stat.ok===0)showMapFailure();
 else if(stat.ok>0)$('mapFallback').hidden=true;
}
function tileUrl(provider,coords){
 return MAP_PROVIDERS[provider].url
  .replace('{z}',String(coords.z)).replace('{x}',String(coords.x)).replace('{y}',String(coords.y))
}
function switchMapProvider(next){
 if(!state.map||!window.L)return;
 mapProvider=next;
 const gen=++mapGeneration;
 mapTileStats={requested:0,ok:0,alternate:0,failed:0,finished:0};
 $('mapFallback').hidden=true;
 $('mapNotice').hidden=true;
 mapStamp();
 const primary=next,alternate=primary==='gsi'?'osm':'gsi';
 const RecoveryLayer=L.GridLayer.extend({
  createTile(coords,done){
   const tile=document.createElement('img');
   tile.alt='';
   tile.setAttribute('aria-hidden','true');
   tile.width=256;tile.height=256;
   tile.style.backgroundColor='#e5e7db';
   if(gen===mapGeneration)mapTileStats.requested++;
   let finished=false,request=0,watchdog=null;
   const cancel=()=>{clearTimeout(watchdog);tile.onload=null;tile.onerror=null};
   const complete=(ok,usedAlternate)=>{
    if(finished)return;
    finished=true;cancel();
    if(gen===mapGeneration){
     mapTileStats.finished++;
     if(ok){mapTileStats.ok++;if(usedAlternate)mapTileStats.alternate++}
     else mapTileStats.failed++;
     updateMapTileStatus(gen);
    }
    done(null,tile);
   };
   const attempt=(provider,round)=>{
    const requestId=++request;
    cancel();
    const rejected=()=>{
     if(finished||requestId!==request)return;
     cancel();
     if(round===0)attempt(alternate,1);
     else {tile.src=EMPTY_TILE;complete(false,false)}
    };
    tile.onload=()=>{
     if(requestId!==request||finished)return;
     complete(true,round===1);
    };
    tile.onerror=rejected;
    watchdog=setTimeout(rejected,7500);
    tile.src=tileUrl(provider,coords);
   };
   attempt(primary,0);
   return tile;
  }
 });
 const layer=new RecoveryLayer({
  tileSize:256,maxZoom:19,maxNativeZoom:18,keepBuffer:1,
  updateWhenIdle:true,
  attribution:MAP_PROVIDERS.gsi.credit+' / '+MAP_PROVIDERS.osm.credit
 });
 const old=mapBaseLayer;
 mapBaseLayer=layer;
 layer.addTo(state.map);
 if(old)state.map.removeLayer(old);
 refreshMapSize(100);
}
function reloadMapTiles(){
 switchMapProvider(mapProvider);
 toast('地図を再取得します');
}
function changeMapProvider(){
 switchMapProvider(mapProvider==='gsi'?'osm':'gsi');
 toast(MAP_PROVIDERS[mapProvider].label+' を優先して表示します');
}
function mapInit(){
 if(!window.L){
  showMapFailure();
  $('mapSourceBtn').disabled=true;
  $('mapRetryBtn').disabled=true;
  return;
 }
 state.map=L.map('map',{zoomControl:false}).setView([state.center.lat,state.center.lng],13);
 state.markers=L.layerGroup().addTo(state.map);
 L.control.zoom({position:'bottomright'}).addTo(state.map);
 switchMapProvider('gsi');
 requestAnimationFrame(()=>refreshMapSize(0));
 window.addEventListener('load',()=>refreshMapSize(150));
 window.addEventListener('resize',()=>refreshMapSize(150));
 window.addEventListener('orientationchange',()=>refreshMapSize(300));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshMapSize(150)});
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(()=>refreshMapSize(100));
  observer.observe($('map'));
 }
 setTimeout(()=>refreshMapSize(350),350);
}
function viewOnMap(){
 const p=state.selected;
 if(!p||p.lat==null||p.lng==null){toast('地図位置が未登録の参考地点です');return}
 $('detail').close();
 if(state.tab==='journal')showTab('places');
 if(!state.map){window.open(googleMapsLink(p),'_blank','noopener');return}
 if(state.focusMarker)state.map.removeLayer(state.focusMarker);
 state.map.setView([p.lat,p.lng],Math.max(15,state.map.getZoom()),{animate:false});
 const icon=L.divIcon({className:'',html:'<div class="pixel-pin focus-pin"></div>',iconSize:[26,26],iconAnchor:[13,13]});
 state.focusMarker=L.marker([p.lat,p.lng],{icon,zIndexOffset:1000}).addTo(state.map);
 $('mapFallbackLink').href=googleMapsLink(p);$('mapNoticeLink').href=googleMapsLink(p);
 document.querySelector('.map-wrap').scrollIntoView({behavior:'smooth',block:'center'});
 refreshMapSize(160)
}
function updateMap(){const c=state.center;mapStamp();if(state.map){if(state.focusMarker){state.map.removeLayer(state.focusMarker);state.focusMarker=null}state.map.setView([c.lat,c.lng],13);refreshMapSize(100)}$('mapFallbackLink').href=googleMapsLink(c);$('mapNoticeLink').href=googleMapsLink(c);renderList()}
let reqSeq=0;
async function fetchPlaces(extra=''){const seq=++reqSeq;state.loading=true;$('message').textContent='施設を探しています…';try{const c=state.center;const qs=new URLSearchParams({center:`${c.lng},${c.lat}`,radius:'6000',limit:'200'});if(extra)qs.set('q',extra);const controller=new AbortController();const tm=setTimeout(()=>controller.abort(),11000);let response;try{response=await fetch(`${API}?${qs}`,{signal:controller.signal})}finally{clearTimeout(tm)}if(!response.ok)throw new Error('HTTP '+response.status);const json=await response.json();if(seq!==reqSeq)return;state.results=(Array.isArray(json.results)?json.results:[]).map(normalize).filter(Boolean).filter(p=>state.adultOK||p.type!=='adult');if(extra==='風俗 ソープ キャバクラ ホストクラブ')state.results=state.results.filter(p=>p.type==='adult');state.lastFetch=Date.now();}catch(err){if(seq!==reqSeq)return;state.results=[];$('message').textContent='施設データが読み込めません。参考スポットのみ表示します。';console.warn('OpenPOI search unavailable',err)}finally{if(seq===reqSeq){state.loading=false;renderList();checkNear()}}}
function openDetail(p){
 state.selected=p;const row=eventFor(p,'seen');
 $('detailType').textContent=(TYPES[p.type]||TYPES.other)[1];
 $('detailName').textContent=p.name;
 $('detailMeta').textContent=[where(p),prettyDist(p)].filter(Boolean).join(' · ');
 $('detailNote').textContent=p.note||'気になったら、旅帖に残しておきましょう。';
 $('detailTags').innerHTML=badgesFor(p,row)+(p.source==='guide'?'<small class="detail-source">参考地点・自動判定対象外</small>':p.source==='tottori-city-poi'?'<a class="detail-source" href="'+HOSAI_DATASET+'" target="_blank" rel="noopener">鳥取市オープンデータ ↗</a>':'<small class="detail-source">OpenPOI API</small>');
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
function onLocation(pos,recenter){const p={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};state.gps=p;const inPref=isTottori(p);status(inPref?`現在地を取得 · 精度 約${Math.round(p.accuracy)}m`:'鳥取県外 · 鳥取のスポットを表示',inPref);if(recenter){if(!inPref){toast('現在地は鳥取県外です。鳥取のエリアを表示します');renderList();return}state.center={lat:p.lat,lng:p.lng};const ks=Object.keys(AREAS);state.area=ks.reduce((a,b)=>meters(p,AREAS[b])<meters(p,AREAS[a])?b:a);$('area').value=state.area;updateMap();fetchPlaces()}else{drawMarkers(filtered());if(!inPref)return;checkNear();if(state.tracking&&(!state.lastLoc||meters(p,state.lastLoc)>300)&&Date.now()-state.lastFetch>60000){state.center={lat:p.lat,lng:p.lng};state.lastLoc=p;updateMap();fetchPlaces()}}}
function locate(){if(!navigator.geolocation){toast('この端末では現在地を取得できません');return}status('現在地を確認中…');navigator.geolocation.getCurrentPosition(p=>onLocation(p,true),locationFailure,{enableHighAccuracy:true,timeout:12000,maximumAge:15000})}
function checkNear(){if(!state.tracking||!state.gps||state.gps.accuracy>80)return;let found=0;for(const p of [...state.results,...currentGuides().filter(g=>g.source==='tottori-city-poi')]){if(p.verified===false||p.lat==null||p.lng==null)continue;const d=meters(state.gps,p);if(d<=160&&!state.journal[p.id]?.nearAt){eventFor(p,'near');found++}}if(found){toast(`${found}か所とすれ違いました`);renderList();if(state.tab==='journal')renderJournal()}}
function toggleTracking(){if(state.tracking){navigator.geolocation.clearWatch(state.watch);state.watch=null;state.tracking=false;$('trackBtn').textContent='◇ すれ違い OFF';$('trackBtn').setAttribute('aria-pressed','false');return}if(!navigator.geolocation){toast('位置情報が使えません');return}state.tracking=true;$('trackBtn').textContent='◆ すれ違い ON';$('trackBtn').setAttribute('aria-pressed','true');state.watch=navigator.geolocation.watchPosition(p=>onLocation(p,false),err=>{locationFailure(err);toggleTracking()},{enableHighAccuracy:true,maximumAge:10000,timeout:20000})}
function chooseFilter(f){if(f==='adult'&&!state.adultOK){$('adultDialog').showModal();return}state.filter=f;for(const btn of document.querySelectorAll('[data-filter]')){const on=btn.dataset.filter===f;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on))}if(f==='adult'){fetchPlaces('風俗 ソープ キャバクラ ホストクラブ')}else if(state.results.length===0||state.lastFetch===0){fetchPlaces()}else if(state.lastQuery==='adult'){state.lastQuery='';fetchPlaces()}else renderList();if(f==='adult')state.lastQuery='adult'}
function resetArea(){const a=AREAS[$('area').value];state.area=$('area').value;state.center={lat:a.lat,lng:a.lng};state.gps=null;state.query='';$('search').value='';state.lastQuery='';updateMap();fetchPlaces(state.filter==='adult'?'風俗 ソープ キャバクラ ホストクラブ':'')}
function doSearch(ev){ev.preventDefault();state.query=$('search').value.trim();if(state.query){state.filter='all';for(const b of document.querySelectorAll('[data-filter]')){b.classList.toggle('active',b.dataset.filter==='all');b.setAttribute('aria-pressed',String(b.dataset.filter==='all'))}const query=state.query;state.query='';fetchPlaces(query).then(()=>{state.query='';renderList()})}else fetchPlaces()}
function dataRows(){return Object.values(state.journal).filter(v=>v&&v.place).sort((a,b)=>new Date(a.seenAt||a.nearAt||a.visitedAt||0)-new Date(b.seenAt||b.nearAt||b.visitedAt||0))}
function stamp(d){if(!d)return '';const v=new Date(d);return Number.isNaN(v.getTime())?'':new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(v)}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function backup(){const payload={app:'とっとりトリップ',version:1,exportedAt:new Date().toISOString(),entries:dataRows()};download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'tottori-trip-backup.json');toast('バックアップを作成しました')}
async function restore(ev){const file=ev.target.files?.[0];ev.target.value='';if(!file)return;if(file.size>3000000){toast('ファイルが大きすぎます');return}try{const data=JSON.parse(await file.text());if(data.app!=='とっとりトリップ'||!Array.isArray(data.entries)||data.entries.length>3000)throw Error('invalid file');let count=0;for(const row of data.entries){if(!row||typeof row.id!=='string'||row.id.length>220||typeof row.place?.name!=='string'||row.place.name.length>150)continue;const p=row.place;const safe={id:row.id,name:p.name.slice(0,130),type:Object.hasOwn(TYPES,p.type)?p.type:'other',lat:Number.isFinite(Number(p.lat))&&p.lat!==null?Number(p.lat):null,lng:Number.isFinite(Number(p.lng))&&p.lng!==null?Number(p.lng):null,address:String(p.address||'').slice(0,180),note:String(p.note||'').slice(0,400),source:String(p.source||''),verified:p.verified===true,licenses:Array.isArray(p.licenses)?p.licenses.slice(0,15):[],attributions:Array.isArray(p.attributions)?p.attributions.slice(0,15):[]};state.journal[row.id]={id:row.id,place:safe,seenAt:safeDate(row.seenAt),nearAt:safeDate(row.nearAt),visitedAt:safeDate(row.visitedAt)};count++}save();renderJournal();toast(`${count}件を復元しました`)}catch{toast('復元できないJSONファイルです')}}
function safeDate(s){if(typeof s!=='string'||s.length>40)return null;return Number.isNaN(Date.parse(s))?null:s}
function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines){const chars=Array.from(text);let line='',lines=0;for(const c of chars){if(ctx.measureText(line+c).width>maxWidth&&line){ctx.fillText(line,x,y+lines*lineHeight);lines++;line=c;if(lines>=maxLines)return lines}else line+=c}if(line&&lines<maxLines){ctx.fillText(line,x,y+lines*lineHeight);lines++}return lines}
function makeCanvas(){const total=dataRows().length,rows=dataRows().slice(0,60);const w=900,top=240,rowH=88,h=Math.max(480,top+Math.max(1,rows.length)*rowH+100);const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#f6f2e6';x.fillRect(0,0,w,h);x.fillStyle='#253348';x.font='bold 56px sans-serif';x.fillText('とっとりトリップ',60,100);x.font='24px sans-serif';x.fillText(new Date().toLocaleDateString('ja-JP'),62,150);x.fillText(`みつけた ${rows.filter(r=>r.seenAt).length}   すれ違い ${rows.filter(r=>r.nearAt).length}   訪れた ${rows.filter(r=>r.visitedAt).length}`,60,194);rows.forEach((r,i)=>{const y=top+i*rowH;x.fillStyle=i%2?'#f0ebdd':'#fffdf5';x.fillRect(45,y-12,w-90,rowH-4);x.fillStyle='#253348';x.font='bold 25px sans-serif';drawWrapped(x,r.place.name,60,y+23,650,26,1);x.font='20px sans-serif';x.fillStyle='#6b727b';x.fillText(`${rank(r)}  ${stamp(r.visitedAt||r.nearAt||r.seenAt)}`,62,y+56)});x.fillStyle='#253348';x.font='18px sans-serif';x.fillText(`TOTTORI TRIP  ·  OpenPOI API  ·  ${rows.length}/${total}件`,50,h-32);return c}
async function imageExport(){try{const c=makeCanvas();const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('png');const file=new File([blob],'tottori-trip.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:'とっとりトリップ'});return}catch(err){if(err.name==='AbortError')return}}download(blob,'tottori-trip.png');toast('旅帖の画像を作成しました')}catch{toast('画像を作成できませんでした')}}
function openGoogle(){const p=state.selected;if(p)window.open(googleMapsLink(p),'_blank','noopener')}
function init(){mapInit();$('area').addEventListener('change',resetArea);$('locateBtn').addEventListener('click',locate);$('trackBtn').addEventListener('click',toggleTracking);$('searchForm').addEventListener('submit',doSearch);document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>chooseFilter(b.dataset.filter)));$('placesTab').addEventListener('click',()=>showTab('places'));$('journalTab').addEventListener('click',()=>showTab('journal'));$('visitBtn').addEventListener('click',()=>recordClick('visited'));$('nearBtn').addEventListener('click',()=>recordClick('near'));$('googleMapsBtn').addEventListener('click',openGoogle);$('viewOnMapBtn').addEventListener('click',viewOnMap);$('mapSourceBtn').addEventListener('click',changeMapProvider);$('mapRetryBtn').addEventListener('click',reloadMapTiles);$('mapFallbackRetryBtn').addEventListener('click',reloadMapTiles);$('infoBtn').addEventListener('click',()=>$('info').showModal());$('adultConfirm').addEventListener('click',()=>{state.adultOK=true;$('adultDialog').close();chooseFilter('adult')});$('adultCancel').addEventListener('click',()=>$('adultDialog').close());$('imageBtn').addEventListener('click',imageExport);$('printBtn').addEventListener('click',()=>{renderJournal();window.print()});$('backupBtn').addEventListener('click',backup);$('restoreFile').addEventListener('change',restore);$('journalCount').textContent=Object.keys(state.journal).length;renderList();fetchPlaces();}
init();