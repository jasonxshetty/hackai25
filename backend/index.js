require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ No OPENAI_API_KEY in .env!');
  process.exit(1);
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// helper to inject TFS instruction
function addTfsPrompt(base) {
  return base +
    '\n\nAt the very top of your report, include a **TFS:** line with a Threat Forecast Score from 0 to 10 (e.g. `TFS: 7.5/10`).';
}

// POST /api/chat  (unchanged)
app.post('/api/chat', async (req, res) => {
  const { sessionType, name, age, inputs } = req.body;
  const intro = name && age
    ? `This session is with ${name}, age ${age}. `
    : '';
  const systemPrompt = intro +
    `You are an empathetic AI therapist speaking to one client. Offer emotional support, flag any risks, and suggest resources.`;

  const messages = [
    { role:'system', content: systemPrompt },
    { role:'user',   content: inputs[0] }
  ];
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages, temperature:0.8
    });
    res.json({ reply: resp.choices[0].message.content });
  } catch(err) {
    console.error('CHAT ERROR', err);
    res.status(500).json({ error:'LLM error', details: err.message });
  }
});

// POST /api/report  ← unified report (history + optional logs)
app.post('/api/report', async (req, res) => {
  const {
    sessionType,
    history,
    name, age,
    nameA, ageA,
    nameB, ageB,
    logs
  } = req.body;

  // personalized intro
  let intro = '';
  if (sessionType==='individual') {
    intro = `This is a clinical report for ${name}, age ${age}.\n\n`;
  } else {
    intro = `This is a relationship report for ${nameA} (age ${ageA}) and ${nameB} (age ${ageB}).\n\n`;
  }

  // base report prompt
  const basePrompt = sessionType==='dual'
    ? `You are an expert relationship analyst. Based on the following conversation history, generate:
1. Summary of each person’s key concerns
2. Relationship dynamics
3. Risk factors
4. Actionable next steps`
    : `You are a clinical AI therapist. Based on the following one-on-one session, generate:
1. Summary of emotional state
2. DSM-informed findings
3. Risk flags
4. Actionable next steps`;

  // inject TFS instruction
  const systemPrompt = addTfsPrompt(intro + basePrompt);

  // assemble messages: history then logs (if any), then final ask
  const messages = [
    { role:'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content }))
  ];
  if (logs) {
    messages.push({ role:'user', content: `Transcript logs:\n\n${logs}` });
  }
  messages.push({ role:'system', content:'Please provide the final structured report now.' });

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages, temperature:0.7
    });
    res.json({ report: resp.choices[0].message.content });
  } catch(err) {
    console.error('REPORT ERROR', err);
    res.status(500).json({ error:'LLM error', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> {
  console.log(`🩺 Therapy API listening on http://localhost:${PORT}`);
});