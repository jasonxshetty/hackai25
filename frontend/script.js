// element refs
const selScreen    = document.getElementById('selectionScreen');
const infoScreen   = document.getElementById('infoScreen');
const chatScreen   = document.getElementById('chatScreen');
const reportScreen = document.getElementById('reportScreen');

const soloBtn      = document.getElementById('soloBtn');
const dualBtn      = document.getElementById('dualBtn');
const homeLink     = document.getElementById('homeLink');
const infoTitle    = document.getElementById('infoTitle');
const nameInput    = document.getElementById('nameInput');
const ageInput     = document.getElementById('ageInput');
const infoNextBtn  = document.getElementById('infoNextBtn');

const backBtn      = document.getElementById('backBtn');
const sessionTitle = document.getElementById('sessionTitle');
const chatLog      = document.getElementById('chatLog');
const inputA       = document.getElementById('inputA');
const sendIcon     = document.getElementById('sendIcon');
const finishBtn    = document.getElementById('finishBtn');

const reportLog     = document.getElementById('reportLog');
const downloadBtn   = document.getElementById('downloadBtn');
const newSessionBtn = document.getElementById('newSessionBtn');

// state
let sessionType, stage;
let nameSolo, ageSolo, historySolo;
let nameA, ageA, historyA;
let nameB, ageB, historyB;

// switch screens
function showScreen(s) {
  [selScreen, infoScreen, chatScreen, reportScreen]
    .forEach(x => x.style.display = x===s ? 'block' : 'none');
}
showScreen(selScreen);

// MD→HTML with real headers
function renderReport(md) {
  const lines = md.split('\n').filter(l => l.trim());
  const items = [], html = [];

  lines.forEach(l => {
    const hMatch = l.match(/^#+\s+(.*)/);
    if (hMatch) {
      html.push(`<h3>${hMatch[1]}</h3>`);
      return;
    }
    const numMatch = l.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      items.push(numMatch[2]);
      return;
    }
    if (items.length) {
      html.push('<ol>' + items.map(i=>`<li>${i}</li>`).join('') + '</ol>');
      items.length = 0;
    }
    html.push(`<p>${l}</p>`);
  });
  if (items.length) {
    html.push('<ol>' + items.map(i=>`<li>${i}</li>`).join('') + '</ol>');
  }

  return html.join('');
}

// add message
function addMsg(text, isUser) {
  const p = document.createElement('p');
  p.className = `chat-msg ${isUser?'user-msg':'adler-msg'}`;
  chatLog.appendChild(p);

  // typewriter animation for Adler
  if (!isUser) {
    let i=0;
    const iv = setInterval(()=>{
      p.textContent += text.charAt(i);
      chatLog.scrollTop = chatLog.scrollHeight;
      i++;
      if (i>=text.length) clearInterval(iv);
    },20);
  } else {
    p.textContent = text;
    chatLog.scrollTop = chatLog.scrollHeight;
  }
}

// send logic
async function sendMessage() {
  const msg = inputA.value.trim();
  if (!msg) return;
  inputA.value='';

  addMsg(msg, true);
  if (stage==='chatSolo') historySolo.push({role:'user',content:msg});
  else if (stage==='chatA') historyA.push({role:'user',content:msg});
  else                historyB.push({role:'user',content:msg});

  try {
    const res = await fetch('http://localhost:3000/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        sessionType,
        name: stage==='chatSolo'?nameSolo:(stage==='chatA'?nameA:nameB),
        age:  stage==='chatSolo'?ageSolo : (stage==='chatA'?ageA:ageB),
        inputs:[msg]
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const { reply } = await res.json();

    if (stage==='chatSolo') historySolo.push({role:'assistant',content:reply});
    else if (stage==='chatA') historyA.push({role:'assistant',content:reply});
    else historyB.push({role:'assistant',content:reply});

    addMsg(reply, false);

  } catch(err) {
    console.error(err);
    alert('Error during chat. Check console.');
  }
}

// bind Enter and sendIcon
inputA.addEventListener('keydown', e=>{
  if(e.key==='Enter'&&!e.shiftKey){
    e.preventDefault(); sendMessage();
  }
});
sendIcon.addEventListener('click', sendMessage);

// Selection
soloBtn.addEventListener('click',()=>{
  sessionType='individual'; stage='infoSolo';
  infoTitle.textContent='Solo Session — Your Info';
  nameInput.value=sessionStorage.getItem('name')||'';
  ageInput.value =sessionStorage.getItem('age') ||'';
  showScreen(infoScreen);
});
dualBtn.addEventListener('click',()=>{
  sessionType='dual'; stage='infoA';
  infoTitle.textContent='Dual Session — User A Info';
  nameInput.value=sessionStorage.getItem('nameA')||'';
  ageInput.value =sessionStorage.getItem('ageA') ||'';
  showScreen(infoScreen);
});

// Info→Chat
infoNextBtn.addEventListener('click',()=>{
  const nm=nameInput.value.trim(), ag=ageInput.value.trim();
  if(!nm||!ag) return alert('Enter name & age.');
  if(stage==='infoSolo'){
    nameSolo=nm; ageSolo=ag; historySolo=[];
    sessionStorage.setItem('name',nm);
    sessionStorage.setItem('age',ag);
    stage='chatSolo';
  } else if(stage==='infoA'){
    nameA=nm; ageA=ag; historyA=[];
    sessionStorage.setItem('nameA',nm);
    sessionStorage.setItem('ageA',ag);
    stage='chatA';
  } else {
    nameB=nm; ageB=ag; historyB=[];
    sessionStorage.setItem('nameB',nm);
    sessionStorage.setItem('ageB',ag);
    stage='chatB';
  }
  sessionTitle.textContent =
    stage==='chatSolo'?`Solo Session for ${nameSolo}`:
    stage==='chatA'   ?`Session — ${nameA}`:
                       `Session — ${nameB}`;
  chatLog.textContent=''; inputA.value='';
  showScreen(chatScreen);
});

// Finish→Report
finishBtn.addEventListener('click',async()=>{
  try {
    let payload;
    if(sessionType==='individual'&&stage==='chatSolo'){
      payload={sessionType,history:historySolo,name:nameSolo,age:ageSolo};
    } else if(sessionType==='dual'&&stage==='chatA'){
      stage='infoB';
      infoTitle.textContent='Dual Session — User B Info';
      nameInput.value=sessionStorage.getItem('nameB')||'';
      ageInput.value =sessionStorage.getItem('ageB') ||'';
      showScreen(infoScreen);
      return;
    } else {
      const combined=[...historyA,...historyB];
      payload={sessionType,history:combined,nameA,ageA,nameB,ageB};
    }
    const res=await fetch('http://localhost:3000/api/report',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok)throw new Error(await res.text());
    const {report}=await res.json();
    reportLog.innerHTML=renderReport(report);
    showScreen(reportScreen);

  } catch(e){
    console.error(e);
    alert('Unable to generate report.');
  }
});

// Download PDF
downloadBtn.addEventListener('click',()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const text = reportLog.innerText;
  const lines = doc.splitTextToSize(text, 180);
  doc.text(lines, 10, 10);
  doc.save('Therapy_Report.pdf');
});

// Navigation
backBtn.addEventListener('click',()=>showScreen(selScreen));
newSessionBtn.addEventListener('click',()=>{
  sessionStorage.clear();
  showScreen(selScreen);
});