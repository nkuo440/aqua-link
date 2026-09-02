const KEY={profile:"aquaProfileNext",reports:"aquaReportsNext",missions:"aquaMissionNext"};
// Optional cloud layer: works with Supabase when config.js contains a project URL and publishable key.
const CLOUD = window.AQUA_SUPABASE || {};
const supabaseClient = (window.supabase && CLOUD.url && CLOUD.anonKey && !CLOUD.url.includes("YOUR_PROJECT"))
  ? window.supabase.createClient(CLOUD.url, CLOUD.anonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  : null;
let cloudUser = null;
async function refreshCloudSession(){
  if(!supabaseClient)return;
  const {data}=await supabaseClient.auth.getSession(); cloudUser=data?.session?.user||null; updateAuthUI();
  if(cloudUser){ await ensureCloudProfile(); await loadCloudProfile(); }
}
function updateAuthUI(){
  const b=qs("#authOpen"); if(!b)return;
  document.body.classList.toggle("signed-in",!!cloudUser);
  b.textContent=cloudUser?"Account":"Sign in";
}
async function ensureCloudProfile(){
  if(!supabaseClient||!cloudUser)return;
  const current=profile();
  const {data}=await supabaseClient.from("profiles").select("id").eq("id",cloudUser.id).maybeSingle();
  if(!data){await syncCloudProfile(current);}
}
async function loadCloudProfile(){
  if(!supabaseClient||!cloudUser)return;
  const {data}=await supabaseClient.from("profiles").select("display_name,school_name,xp,level,role").eq("id",cloudUser.id).maybeSingle();
  if(data){save(KEY.profile,{...profile(),name:data.display_name||profile().name,school:data.school_name||profile().school,role:data.role||profile().role,xp:data.xp||170,level:data.level||3});updateProfileUI();}
}
async function syncCloudReport(r){
  if(!supabaseClient||!cloudUser)return false;
  const {error}=await supabaseClient.from("reports").insert({id:r.id,reporter_id:cloudUser.id,issue_type:r.type,location:r.location,status:r.status,note:r.note,latitude:r.lat,longitude:r.lng});
  if(error){console.error(error);toast("Saved locally, but cloud sync failed");return false} return true;
}
async function syncCloudProfile(p){
  if(!supabaseClient||!cloudUser)return false;
  const {error}=await supabaseClient.from("profiles").upsert({id:cloudUser.id,display_name:p.name,school_name:p.school,role:p.role,xp:p.xp||170,level:p.level||3,updated_at:new Date().toISOString()});
  if(error){console.error(error);toast("Profile saved locally; cloud sync failed");return false} return true;
}
async function loadCloudReports(){
  if(!supabaseClient||!cloudUser)return;
  const {data,error}=await supabaseClient.from("reports").select("id,issue_type,location,status,note,latitude,longitude,created_at").order("created_at",{ascending:false}).limit(50);
  if(error){console.error(error);return}
  if(data?.length){
    const mapped=data.map(r=>({id:r.id,type:r.issue_type,location:r.location,status:r.status,note:r.note||"",lat:r.latitude,lng:r.longitude,date:new Date(r.created_at).toLocaleString([], {day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}));
    save(KEY.reports,mapped);renderActivity();
  }
}
async function initAuth(){
  if(!supabaseClient){updateAuthUI();return}
  await refreshCloudSession(); await loadCloudReports();
  supabaseClient.auth.onAuthStateChange(async (_event,session)=>{cloudUser=session?.user||null;updateAuthUI();if(cloudUser){await ensureCloudProfile();await loadCloudProfile();await loadCloudReports();}});
}
function authInit(){
  const modal=qs("#authModal"); if(!modal)return; let mode="signin";
  const open=()=>{modal.classList.add("show");modal.setAttribute("aria-hidden","false");};
  const close=()=>{modal.classList.remove("show");modal.setAttribute("aria-hidden","true");};
  qs("#authOpen").addEventListener("click",()=>{if(cloudUser){supabaseClient?.auth.signOut();return}mode="signin";qs("#authTitle").textContent="Sign in to your network";qs("#authSubmit").textContent="Sign in";qs("#authSwitch").textContent="Need an account? Create one";open()});
  qs("#authClose").addEventListener("click",close);
  qs("#authSwitch").addEventListener("click",()=>{mode=mode==="signin"?"signup":"signin";qs("#authTitle").textContent=mode==="signin"?"Sign in to your network":"Create your Aqua Link account";qs("#authSubmit").textContent=mode==="signin"?"Sign in":"Create account";qs("#authSwitch").textContent=mode==="signin"?"Need an account? Create one":"Already have an account? Sign in"});
  qs("#authSubmit").addEventListener("click",async()=>{
    const status=qs("#authStatus"); if(!supabaseClient){status.textContent="Cloud account is not configured yet. Add your Supabase project values to config.js.";return}
    const email=qs("#authEmail").value.trim(),password=qs("#authPassword").value;
    if(!email||password.length<8){status.textContent="Enter an email and a password of at least 8 characters.";return}
    status.textContent="Working…";
    const result=mode==="signin"?await supabaseClient.auth.signInWithPassword({email,password}):await supabaseClient.auth.signUp({email,password});
    if(result.error){status.textContent=result.error.message;return}
    status.textContent=mode==="signup"?"Account created. Check your email if confirmation is enabled.":"Signed in.";toast(mode==="signup"?"Aqua Link account created ✓":"Welcome back ✓");setTimeout(close,700);
  });
}

const seedReports=[
{id:"AL-011",type:"Leaking tap",location:"Block D",status:"Resolved",date:"Today · 08:14",note:"Tap dripping at the handwashing station.",lat:-26.65795,lng:27.92955},
{id:"AL-012",type:"Running toilet",location:"Block E",status:"Under investigation",date:"Today · 09:22",note:"Toilet continues running after use.",lat:-26.65825,lng:27.93035},
{id:"AL-013",type:"Water quality",location:"SPORTS FIELD",status:"Reported",date:"Today · 10:06",note:"Learner noticed unusual appearance at water point.",lat:-26.65865,lng:27.92925}
];
const missions=[
["Leak Detective","Find one water point that needs attention and record what you see.",50,"FIELD"],
["Five Point Audit","Inspect five school water points and note their condition.",80,"FIELD"],
["Water Minute","Observe one routine and identify one avoidable water-use habit.",40,"SCIENCE"],
["Community Water Story","Ask a community member about a local water challenge.",60,"COMMUNITY"],
["Map the Flow","Trace where water enters, moves through and leaves your school.",70,"SCIENCE"]
];
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const profile=()=>get(KEY.profile,{name:"Onthatile",role:"Learner",school:"Riverside High School"});
const reports=()=>get(KEY.reports,seedReports);
const completed=()=>get(KEY.missions,[0,1,2]);
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function qs(s){return document.querySelector(s)}
function toast(msg){const t=qs("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300)}
function go(hash){history.pushState({}, "", hash);render()}
function render(){
 const hash=location.hash||"#home";
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
 const target=qs(hash)||qs("#home");target.classList.add("active-view");
 document.querySelectorAll(".desktop-nav a,.mobile-nav a").forEach(a=>a.classList.toggle("active",a.getAttribute("href")===hash));
 window.scrollTo({top:0,behavior:"smooth"});
 if(hash==="#map")setTimeout(initMap,50);
}
function updateProfileUI(){
 const p=profile(), initial=(p.name||"O")[0].toUpperCase();
 ["#navAvatar","#bigAvatar"].forEach(s=>{const e=qs(s);if(e)e.textContent=initial});
 ["#navName","#heroName","#profileTitle"].forEach(s=>{const e=qs(s);if(e)e.textContent=s==="#heroName"?p.name+".":p.name});
 if(qs("#profileRole"))qs("#profileRole").textContent=`${p.role} · ${p.school}`;
}
function renderActivity(){
 const box=qs("#activityFeed"); if(!box)return;
 const icons=["⌁","◉","↗","◇"];
 box.innerHTML=reports().slice(0,4).map((r,i)=>`<div class="activity-item"><span class="activity-dot">${icons[i%4]}</span><div><b>${r.location} · ${r.type}</b><small>${r.note}</small></div><div><span class="status ${r.status==="Under investigation"?"blue":""}">${r.status}</span><time>${r.date}</time></div></div>`).join("");
 const rr=reports();qs("#activeMetric").textContent=rr.filter(r=>r.status!=="Resolved").length;qs("#resolvedMetric").textContent=Math.max(12,rr.filter(r=>r.status==="Resolved").length+11);qs("#impactReports").textContent=14+Math.max(0,rr.length-seedReports.length);qs("#impactResolved").textContent=Math.max(12,rr.filter(r=>r.status==="Resolved").length+11);
}
let map, mapMarkers=[];
function initMap(){
 if(!window.L)return; const el=qs("#mapCanvas");if(!el)return;
 if(map){map.invalidateSize();return}
 map=L.map(el,{zoomControl:false}).setView([-26.6581,27.9298],16);
 L.control.zoom({position:"bottomright"}).addTo(map);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors"}).addTo(map);
 L.marker([-26.6581,27.9298]).addTo(map).bindPopup("<b>Riverside High School</b><br>1 Hawthorne St, Three Rivers").openPopup();
 drawMarkers();
}
function drawMarkers(filter="all"){
 if(!map)return;mapMarkers.forEach(m=>m.remove());mapMarkers=[];
 reports().forEach(r=>{
  if(filter==="open"&&r.status==="Resolved")return;if(filter==="resolved"&&r.status!=="Resolved")return;
  const color=r.status==="Resolved"?"#67c85d":r.status==="Under investigation"?"#f4c84c":"#ff765f";
  const m=L.circleMarker([r.lat||-26.6581,r.lng||27.9298],{radius:9,weight:3,color,fillColor:color,fillOpacity:.8}).addTo(map);
  m.bindPopup(`<b>${r.type}</b><br>${r.location}<br><small>${r.status}</small>`);mapMarkers.push(m);
 });
 const zones=[["Block D","1 resolved issue","Resolved"],["Block E","1 issue under investigation","Investigating"],["Block G","No open issues","Clear"],["HALL","Water point monitored","Clear"],["SPORTS FIELD","1 report today","Open"]];
 const z=qs("#zoneList");if(z)z.innerHTML=zones.map(x=>`<div class="zone"><span class="zone-status">${x[2]}</span><b>${x[0]}</b><small>${x[1]}</small></div>`).join("");
}
function renderMissions(){
 const box=qs("#missionList"), done=completed();if(!box)return;
 box.innerHTML=missions.map((m,i)=>`<article class="academy-mission ${done.includes(i)?"done":""}"><div class="mission-num">0${i+1}</div><div><h3>${m[0]}</h3><p>${m[1]} · ${m[3]}</p></div><div><span class="mission-xp">+${m[2]} XP</span><button class="mission-action" onclick="completeMission(${i})">${done.includes(i)?"✓ DONE":"START"}</button></div></article>`).join("");
 const xp=done.reduce((s,i)=>s+missions[i][2],0);const total=170+xp-230;
 const shown=Math.max(170,xp);qs("#xpMetric").textContent=shown;qs("#academyXP").textContent=shown;
 const level=3+Math.floor(Math.max(0,shown-170)/100);qs("#levelMetric").textContent=String(level).padStart(2,"0");qs("#academyLevel").textContent=String(level).padStart(2,"0");
 qs("#academyBar").style.width=Math.min(100,Math.max(0,(shown%100)/100*100))+"%";
}
function completeMission(i){const d=completed();if(!d.includes(i)){d.push(i);save(KEY.missions,d);renderMissions();toast(`Mission complete · +${missions[i][2]} XP`)}}
function reportInit(){
 let chosen="";
 document.querySelectorAll("#issueChoices button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("#issueChoices button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");chosen=b.dataset.value;qs("#previewIssue").textContent=chosen}));
 qs("#reportLocation").addEventListener("change",e=>qs("#previewLocation").textContent=e.target.value);
 qs("#submitReport").addEventListener("click",()=>{
  if(!chosen){toast("Choose an issue type first");return}
  const note=qs("#reportNote").value.trim();if(!note){toast("Add a short description first");return}
  const r=reports();const id="AL-"+String(Date.now()).slice(-3);
  r.unshift({id,type:chosen,location:qs("#reportLocation").value,status:"Reported",date:"Just now",note,lat:-26.6581+(Math.random()-.5)*.001,lng:27.9298+(Math.random()-.5)*.001});
  save(KEY.reports,r);renderActivity();syncCloudReport(r);qs("#newCode").textContent=id;qs(".preview-id").textContent=id;toast(`Report ${id} entered the network ✓`);go("#home");
 });
}
function profileInit(){
 const modal=qs("#profileModal");
 function open(){const p=profile();qs("#profileInput").value=p.name;modal.classList.add("show");modal.setAttribute("aria-hidden","false")}
 function close(){modal.classList.remove("show");modal.setAttribute("aria-hidden","true")}
 qs("#profileOpen").addEventListener("click",open);qs("#mobileProfile").addEventListener("click",open);qs("#profileClose").addEventListener("click",close);
 qs("#saveProfile").addEventListener("click",()=>{const p=profile();const n=qs("#profileInput").value.trim();if(!n)return;const next={...p,name:n};save(KEY.profile,next);updateProfileUI();syncCloudProfile(next);close();toast("Profile updated ✓")});
}
document.addEventListener("DOMContentLoaded",()=>{
 updateProfileUI();renderActivity();renderMissions();reportInit();profileInit();authInit();
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
 document.querySelectorAll(".desktop-nav a,.mobile-nav a,.logo").forEach(a=>a.addEventListener("click",e=>{const h=a.getAttribute("href");if(h&&h.startsWith("#")){e.preventDefault();go(h)}}));
 document.querySelectorAll("[data-map-filter]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-map-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");drawMarkers(b.dataset.mapFilter)}));
 qs("#joinChallenge").addEventListener("click",()=>{completeMission(3);toast("7-day Water Shift joined ✓")});
 qs("#notifyBtn").addEventListener("click",()=>toast("2 network updates waiting"));
 window.addEventListener("hashchange",render);render();
});
window.completeMission=completeMission;
