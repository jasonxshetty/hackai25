// element refs
const selScreen    = document.getElementById('selectionScreen');
const infoScreen   = document.getElementById('infoScreen');
const chatScreen   = document.getElementById('chatScreen');
const reportScreen = document.getElementById('reportScreen');
const splash       = document.getElementById('splashScreen');

const homeLink     = document.getElementById('homeLink');
const soloBtn      = document.getElementById('soloBtn');
const dualBtn      = document.getElementById('dualBtn');
const infoTitle    = document.getElementById('infoTitle');
const nameInput    = document.getElementById('nameInput');
const ageInput     = document.getElementById('ageInput');
const infoNextBtn  = document.getElementById('infoNextBtn');

const sessionTitle = document.getElementById('sessionTitle');
const chatLog      = document.getElementById('chatLog');
const inputA       = document.getElementById('inputA');
const sendIcon     = document.getElementById('sendIcon');
const finishBtn    = document.getElementById('finishBtn');
const backBtn      = document.getElementById('backBtn');

const reportLog     = document.getElementById('reportLog');
const downloadBtn   = document.getElementById('downloadBtn');
const newSessionBtn = document.getElementById('newSessionBtn');

// simple screen switch
function showScreen(s) {
  [selScreen, infoScreen, chatScreen, reportScreen]
    .forEach(x => x.style.display = x===s ? 'block' : 'none');
}
showScreen(selScreen);

// splash toggle
function showSplash() { splash.style.display = 'flex'; }
function hideSplash() { splash.style.display = 'none'; }

// MD→HTML
function renderReport(md) {
  const lines = md.split('\n').filter(l => l.trim());
  const items = [], html = [];
  lines.forEach(l => {
    const h = l.match(/^#+\s+(.*)/);
    if (h) { html.push(`<h3>${h[1]}</h3>`); return; }
    const n = l.match(/^(\d+)\.\s+(.*)/);
    if (n) { items.push(n[2]); return; }
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

// typewriter / user add
function addMsg(text, isUser) {
  const p = document.createElement('p');
  p.className = `chat-msg ${isUser?'user-msg':'adler-msg'}`;
  chatLog.appendChild(p);
  if (!isUser) {
    let i=0;
    const iv = setInterval(()=>{
      p.textContent += text.charAt(i);
      chatLog.scrollTop = chatLog.scrollHeight;
      if (++i >= text.length) clearInterval(iv);
    },20);
  } else {
    p.textContent = text;
    chatLog.scrollTop = chatLog.scrollHeight;
  }
}

// send flow
async function sendMessage() {
  const msg = inputA.value.trim();
  if (!msg) return;
  inputA.value = '';
  addMsg(msg, true);
  if (stage==='chatSolo') historySolo.push({role:'user',content:msg});
  else if (stage==='chatA') historyA.push({role:'user',content:msg});
  else historyB.push({role:'user',content:msg});

  try {
    const res = await fetch('http://localhost:3000/api/chat',{
      method:'POST',headers:{'Content-Type':'application/json'},
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
  } catch(e) {
    console.error(e);
    alert('Error during chat.');
  }
}

// key + icon
inputA.addEventListener('keydown', e=>{
  if (e.key==='Enter' && !e.shiftKey) {
    e.preventDefault(); sendMessage();
  }
});
sendIcon.addEventListener('click', sendMessage);

// home link
homeLink.addEventListener('click', e=>{
  e.preventDefault();
  showScreen(selScreen);
});

// the rest of your script (selection, info→chat, finish→report, download PDF, nav)...
// (unchanged from previous version)