/* Shared logic for each kid's daily page. Set window.KID before loading this. */
(function(){
  "use strict";
  const SB_URL="https://bsjgyynqtrgbakqzhyfq.supabase.co";
  const SB_KEY="sb_publishable_XPMClOrQXP1ka-O0wnWFRw_-tYhhaZi";

  const KIDS={
    ezra:   {name:"Ezra",    color:"#2563eb", light:"#e7efff", dark:"#1e3a8a"},
    arlo:   {name:"Arlo",    color:"#16a34a", light:"#e6f6ea", dark:"#14532d"},
    everett:{name:"Everett", color:"#ea580c", light:"#fdeee2", dark:"#9a3412"}
  };
  const kidKey=(window.KID||"").toLowerCase();
  const kid=KIDS[kidKey];
  if(!kid){document.getElementById("app").innerHTML="<p>Unknown kid.</p>";return;}

  // theme
  const r=document.documentElement.style;
  r.setProperty("--kid",kid.color); r.setProperty("--kid-light",kid.light); r.setProperty("--kid-dark",kid.dark);
  document.title=kid.name+"'s Chores";

  // weekly zone rotation (matches the family chart)
  const ROT=[
    {ezra:"Kitchen & Dining",arlo:"Living Room & Entry",everett:"Bath & Hallway"},
    {ezra:"Bath & Hallway",arlo:"Kitchen & Dining",everett:"Living Room & Entry"},
    {ezra:"Living Room & Entry",arlo:"Bath & Hallway",everett:"Kitchen & Dining"}
  ];
  const ZONEJOBS={
    "Kitchen & Dining":["Empty & fill the dishwasher","Take out trash & recycling","Wipe the table after meals"],
    "Living Room & Entry":["Feed Murphy + fresh water (AM & PM)","Tidy shoes, bags & blankets","Fix couch cushions"],
    "Bath & Hallway":["Wipe the sink & mirror","Hang up the towels","Hang up jackets & hoodies"]
  };
  const BASICS=["Make your bed","Clear your own dishes","10-minute bedroom pickup","Put your shoes & bag away"];
  const SWEEP=[["S","Scoop","Trash in a bag, dishes in a basket"],
               ["W","Wanderers","Stuff that doesn't belong into a tote"],
               ["E","Everything in its place","Tidy around the room"],
               ["E","Eliminate dirt","Dust, then wipe surfaces"],
               ["P","Polish the floor","Sweep, vacuum, mop"]];

  // dates / cycle
  const ANCHOR=new Date(2026,5,22), DAY=86400000;
  const today=new Date();
  const utc=d=>Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const cycleIndex=Math.max(0,Math.floor((utc(today)-utc(ANCHOR))/(14*DAY)));
  const cycleStart=new Date(ANCHOR.getFullYear(),ANCHOR.getMonth(),ANCHOR.getDate()+cycleIndex*14);
  const dayIndex=Math.round((utc(today)-utc(cycleStart))/DAY);           // 0..13 (clamped below)
  const dIdx=Math.min(13,Math.max(0,dayIndex));
  const weekIdx=(((Math.floor((utc(today)-utc(ANCHOR))/(7*DAY)))%3)+3)%3;
  const room=ROT[weekIdx][kidKey];
  const cycleStartStr=ymd(cycleStart);
  const DOWN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const MONN=["January","February","March","April","May","June","July","August","September","October","November","December"];

  const db=window.supabase.createClient(SB_URL,SB_KEY);

  // build task list: basics + zone jobs + sweep-your-room
  const tasks=BASICS.concat(ZONEJOBS[room]||[]).concat(["SWEEP your room (all 5 steps)"]);

  // ---- render ----
  const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  function sweepHtml(){
    return SWEEP.map(([L,t,d])=>'<li><span class="badge">'+L+'</span><span class="t"><b>'+t+'</b>'+esc(d)+'</span></li>').join("");
  }
  function jobsHtml(){
    return (ZONEJOBS[room]||[]).map(j=>'<li><span class="b"></span>'+esc(j)+'</li>').join("");
  }
  function navHtml(){
    const items=[["/","Home",false],["/ezra","Ezra",kidKey==="ezra"],
                 ["/arlo","Arlo",kidKey==="arlo"],["/everett","Everett",kidKey==="everett"]];
    return '<nav class="topnav">'+items.map(([h,t,a])=>'<a href="'+h+'"'+(a?' class="active"':'')+'>'+t+'</a>').join("")+'</nav>';
  }
  function tasksHtml(){
    let h='<div class="grp">Every day</div>';
    tasks.forEach((t,i)=>{
      if(i===BASICS.length) h+='<div class="grp">Your room: '+esc(room)+'</div>';
      if(i===tasks.length-1) h+='<div class="grp">Then</div>';
      h+='<li><label><input type="checkbox" data-i="'+i+'"><span>'+esc(t)+'</span></label></li>';
    });
    return h;
  }

  document.getElementById("app").innerHTML=
    navHtml()
    +'<div class="hero">'
      +'<h1>Hi '+esc(kid.name)+'!</h1>'
      +'<div class="date">'+DOWN[today.getDay()]+', '+MONN[today.getMonth()]+' '+today.getDate()+'</div>'
      +'<div class="room"><small>Your room this week</small>'+esc(room)+'</div>'
    +'</div>'
    +'<div class="card">'
      +'<h2>Today’s checklist</h2>'
      +'<p class="sub">Tick each one as you finish. Check them all and today is done!</p>'
      +'<ul class="checks" id="checks">'+tasksHtml()+'</ul>'
      +'<div class="donebar" id="donebar">0 of '+tasks.length+' done</div>'
      +'<div class="celebrate" id="celebrate">✅ All done today — nice work!</div>'
      +'<div class="status" id="status"></div>'
    +'</div>'
    +'<div class="card">'
      +'<h2>Your room jobs</h2>'
      +'<p class="sub">'+esc(room)+' — do these every day this week</p>'
      +'<ul class="jobs">'+jobsHtml()+'</ul>'
    +'</div>'
    +'<div class="card">'
      +'<h2>Payday progress</h2>'
      +'<p class="sub">2-week cycle — finish your days to earn $20</p>'
      +'<div class="pay"><div><div class="n" id="daysDone">–</div><div class="l">days done / 14</div></div>'
      +'<div><div class="n">$20</div><div class="l" id="payState">–</div></div></div>'
    +'</div>'
    +'<div class="card">'
      +'<h2>How to SWEEP a room</h2>'
      +'<ul class="sweep">'+sweepHtml()+'</ul>'
    +'</div>'
    +'<a class="homebtn" href="/">← Family chart</a>'
    +'<footer>'+esc(kid.name)+'’s daily chores · SWEEP method</footer>';

  // ---- checklist behavior ----
  const boxes=[...document.querySelectorAll('#checks input')];
  const dayKey="kidtasks_"+kidKey+"_"+ymd(today);  // resets each day
  function loadLocal(){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(dayKey)||"{}");}catch(e){}
    boxes.forEach(b=>{b.checked=!!saved[b.dataset.i];});
  }
  function saveLocal(){
    const o={}; boxes.forEach(b=>{if(b.checked)o[b.dataset.i]=1;});
    try{localStorage.setItem(dayKey,JSON.stringify(o));}catch(e){}
  }
  function refreshBar(){
    const n=boxes.filter(b=>b.checked).length;
    const all=n===boxes.length;
    const bar=document.getElementById("donebar");
    bar.textContent=n+" of "+boxes.length+" done";
    bar.classList.toggle("alldone",all);
    document.getElementById("celebrate").classList.toggle("show",all);
    return all;
  }
  function setStatus(t,ok){const s=document.getElementById("status");s.textContent=t;
    s.style.color=ok===false?"#b91c1c":(ok===true?"#15803d":"#6b7280");}

  let lastAll=null;
  async function syncDay(all){
    if(all===lastAll) return; lastAll=all;
    setStatus("Saving…");
    const row={cycle_start:cycleStartStr,kid:kidKey,day_index:dIdx,done:all,updated_at:new Date().toISOString()};
    const {error}=await db.from("chore_log").upsert(row,{onConflict:"cycle_start,kid,day_index"});
    if(error){setStatus("Couldn't save — try again",false);lastAll=null;}
    else{setStatus(all?"Today saved ✓":"Saved ✓",true);loadProgress();}
  }
  boxes.forEach(b=>b.addEventListener("change",()=>{saveLocal();syncDay(refreshBar());}));

  async function loadProgress(){
    const {data,error}=await db.from("chore_log").select("day_index,done").eq("cycle_start",cycleStartStr).eq("kid",kidKey);
    if(error){document.getElementById("payState").textContent="(offline)";return;}
    let days=0, paid=false;
    (data||[]).forEach(x=>{ if(x.done && x.day_index>=0 && x.day_index<=13) days++; if(x.day_index===14 && x.done) paid=true; });
    document.getElementById("daysDone").textContent=days;
    document.getElementById("payState").innerHTML=paid
      ? '<span class="pill paid">Paid</span>' : '<span class="pill pending">Pending</span>';
  }

  // init
  loadLocal();
  lastAll=refreshBar();    // reflect restored state without writing on load
  loadProgress();          // day flag only changes when the kid toggles a task
})();
