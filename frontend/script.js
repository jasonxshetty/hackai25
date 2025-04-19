// frontend/script.js

// --- element refs ---
const selScreen    = document.getElementById('selectionScreen');
const infoScreen   = document.getElementById('infoScreen');
const chatScreen   = document.getElementById('chatScreen');
const reportScreen = document.getElementById('reportScreen');

const soloBtn      = document.getElementById('soloBtn');
const dualBtn      = document.getElementById('dualBtn');
const infoTitle    = document.getElementById('infoTitle');
const nameInput    = document.getElementById('nameInput');
const ageInput     = document.getElementById('ageInput');
const infoNextBtn  = document.getElementById('infoNextBtn');

const backBtn      = document.getElementById('backBtn');
const sessionTitle = document.getElementById('sessionTitle');
const chatLog      = document.getElementById('chatLog');
const inputA       = document.getElementById('inputA');
const sendBtn      = document.getElementById('sendBtn');
const finishBtn    = document.getElementById('finishBtn');

const reportLog     = document.getElementById('reportLog');
const newSessionBtn = document.getElementById('newSessionBtn');

// --- state ---
let sessionType     = null;    // 'individual' or 'dual'
let stage           = null;    // 'infoSolo','chatSolo','infoA','chatA','infoB','chatB'
let nameSolo, ageSolo, historySolo = [];
let nameA, ageA, historyA         = [];
let nameB, ageB, historyB         = [];

// show only one screen
function showScreen(scr) {
  [selScreen, infoScreen, chatScreen, reportScreen]
    .forEach(s => s.style.display = (s === scr ? 'block' : 'none'));
}

// initial
showScreen(selScreen);

/**
 * Very simple MD‑to‑HTML:
 *  - strips leading # from headings
 *  - converts numbered list lines to <ol><li>…</li></ol>
 *  - wraps other lines in <p>
 */
function renderReport(md) {
  const lines = md.split('\n').filter(l => l.trim() !== '');
  const items = [];
  const htmlParts = [];

  lines.forEach(line => {
    // numbered list?
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      items.push(numMatch[2]);
      return;
    }
    // flush any collected <li> items
    if (items.length) {
      htmlParts.push(
        '<ol>' +
          items.map(i => `<li>${i}</li>`).join('') +
        '</ol>'
      );
      items.length = 0;
    }
    // strip MD header markers
    const text = line.replace(/^#+\s*/, '');
    htmlParts.push(`<p>${text}</p>`);
  });

  // flush at end
  if (items.length) {
    htmlParts.push(
      '<ol>' +
        items.map(i => `<li>${i}</li>`).join('') +
      '</ol>'
    );
  }

  return htmlParts.join('');
}

// ─── SELECTION ───────────────────────────────
soloBtn.addEventListener('click', () => {
  sessionType = 'individual';
  stage       = 'infoSolo';
  infoTitle.textContent    = 'Solo Session — Your Info';
  nameInput.value = ageInput.value = '';
  showScreen(infoScreen);
});
dualBtn.addEventListener('click', () => {
  sessionType = 'dual';
  stage       = 'infoA';
  infoTitle.textContent    = 'Dual Session — User A Info';
  nameInput.value = ageInput.value = '';
  showScreen(infoScreen);
});

// ─── INFO → CHAT ─────────────────────────────
infoNextBtn.addEventListener('click', () => {
  const nm = nameInput.value.trim();
  const ag = ageInput.value.trim();
  if (!nm || !ag) return alert('Please enter name & age.');

  if (stage === 'infoSolo') {
    nameSolo   = nm; ageSolo   = ag; historySolo = [];
    stage      = 'chatSolo';
  } else if (stage === 'infoA') {
    nameA      = nm; ageA      = ag; historyA    = [];
    stage      = 'chatA';
  } else if (stage === 'infoB') {
    nameB      = nm; ageB      = ag; historyB    = [];
    stage      = 'chatB';
  }

  const title =
    stage === 'chatSolo' ? `Solo Session for ${nameSolo}` :
    stage === 'chatA'    ? `Session — ${nameA}` :
                           `Session — ${nameB}`;
  sessionTitle.textContent = title;
  chatLog.textContent      = '';
  inputA.value             = '';
  showScreen(chatScreen);
});

// ─── HELPERS FOR MESSAGES ─────────────────────
function addUserMessage(text) {
  const userName =
    stage === 'chatSolo' ? nameSolo :
    stage === 'chatA'    ? nameA   :
                           nameB;
  const p = document.createElement('p');
  p.className = 'chat-msg user-msg';
  const strong = document.createElement('strong');
  strong.textContent = `${userName}: `;
  p.appendChild(strong);
  p.appendChild(document.createTextNode(text));
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addAdlerMessage(text) {
  const p = document.createElement('p');
  p.className = 'chat-msg adler-msg';
  const strong = document.createElement('strong');
  strong.textContent = 'Adler: ';
  p.appendChild(strong);
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;

  let i = 0;
  const iv = setInterval(() => {
    p.appendChild(document.createTextNode(text.charAt(i)));
    chatLog.scrollTop = chatLog.scrollHeight;
    i++;
    if (i >= text.length) clearInterval(iv);
  }, 20);
}

// ─── CHAT “SEND” ─────────────────────────────
sendBtn.addEventListener('click', async () => {
  const msg = inputA.value.trim();
  if (!msg) return alert('Type a message first.');
  inputA.value = '';

  addUserMessage(msg);
  if (stage === 'chatSolo') historySolo.push({ role:'user', content: msg });
  else if (stage === 'chatA') historyA.push({ role:'user', content: msg });
  else if (stage === 'chatB') historyB.push({ role:'user', content: msg });

  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        sessionType,
        name: stage==='chatSolo' ? nameSolo : (stage==='chatA'?nameA:nameB),
        age:  stage==='chatSolo' ? ageSolo  : (stage==='chatA'?ageA:ageB),
        inputs: [ msg ]
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const { reply } = await res.json();

    if (stage === 'chatSolo') historySolo.push({ role:'assistant', content: reply });
    else if (stage === 'chatA') historyA.push({ role:'assistant', content: reply });
    else if (stage === 'chatB') historyB.push({ role:'assistant', content: reply });

    addAdlerMessage(reply);
  } catch (err) {
    console.error('Chat error:', err);
    alert('Error during chat. Check console.');
  }
});

// ─── CHAT “FINISH” ───────────────────────────
finishBtn.addEventListener('click', async () => {
  try {
    if (sessionType==='individual' && stage==='chatSolo') {
      const res = await fetch('http://localhost:3000/api/report', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          sessionType,
          history: historySolo,
          name: nameSolo,
          age: ageSolo
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const { report } = await res.json();
      reportLog.innerHTML = renderReport(report);
      showScreen(reportScreen);

    } else if (sessionType==='dual' && stage==='chatA') {
      stage = 'infoB';
      infoTitle.textContent = 'Dual Session — User B Info';
      nameInput.value = ageInput.value = '';
      showScreen(infoScreen);

    } else if (sessionType==='dual' && stage==='chatB') {
      const combined = [...historyA, ...historyB];
      const res = await fetch('http://localhost:3000/api/report', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          sessionType,
          history: combined,
          nameA, ageA,
          nameB, ageB
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const { report } = await res.json();
      reportLog.innerHTML = renderReport(report);
      showScreen(reportScreen);
    }
  } catch (err) {
    console.error('Report error:', err);
    alert('Unable to generate report.');
  }
});

// ─── NAVIGATION ─────────────────────────────
backBtn.addEventListener('click', () => showScreen(selScreen));
newSessionBtn.addEventListener('click', () => {
  sessionType = stage = null;
  nameSolo = ageSolo = historySolo = [];
  nameA = ageA = historyA = [];
  nameB = ageB = historyB = [];
  showScreen(selScreen);
});