// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ No OPENAI_API_KEY in .env!');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/chat
// body: {
//   sessionType: 'individual'|'dual',
//   name: string, age: number,
//   inputs: [string]
// }
app.post('/api/chat', async (req, res) => {
  console.log('[API] /api/chat ←', req.body);
  const { name, age, inputs } = req.body;

  // personalize intro
  const intro = name && age
    ? `This session is with ${name}, age ${age}. `
    : '';

  // always use individual-therapist prompt
  const systemPrompt = intro + 
    `You are an empathetic AI therapist speaking to one client. ` +
    `Offer emotional support, flag any risks, and suggest resources.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: inputs[0] }
  ];

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      temperature: 0.8
    });
    const reply = resp.choices[0].message.content;
    console.log('[API] /api/chat →', reply);
    res.json({ reply });
  } catch (err) {
    console.error('[API] /api/chat ERROR:', err);
    res.status(500).json({ error: 'LLM error', details: err.message || err });
  }
});

// POST /api/report
// body: {
//   sessionType: 'individual'|'dual',
//   history: [{ role, content }],
//   name?: string, age?: number,
//   nameA?: string, ageA?: number,
//   nameB?: string, ageB?: number
// }
app.post('/api/report', async (req, res) => {
  console.log('[API] /api/report ←', req.body);
  const { sessionType, history, name, age, nameA, ageA, nameB, ageB } = req.body;

  // build personalized intro for report
  let intro = '';
  if (sessionType === 'individual') {
    intro = `This report is for ${name}, age ${age}. `;
  } else {
    intro = `This report is for two clients: ${nameA} (age ${ageA}) and ${nameB} (age ${ageB}). `;
  }

  // choose summarization prompt
  const basePrompt = sessionType === 'dual'
    ? `You are an expert relationship analyst. You’ve seen two clients A & B describe their experience, with the therapist interjecting. Now produce a **structured report**:
1. Summary of each person’s key concerns
2. Relationship dynamics flagged (e.g. manipulation, gaslighting)
3. Risk level & DSM‑informed traits
4. Actionable recommendations and resources.`
    : `You are a clinical AI therapist. You just finished a one‑on‑one session. Now produce a **structured report**:
1. Summary of the user’s emotional state
2. DSM‑informed findings (e.g. hypervigilance, dissociation)
3. Risk flags
4. Actionable next steps & resources.`;

  const systemPrompt = intro + basePrompt;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'system', content: 'Please generate the final report now.' }
  ];

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      temperature: 0.7
    });
    const report = resp.choices[0].message.content;
    console.log('[API] /api/report →', report);
    res.json({ report });
  } catch (err) {
    console.error('[API] /api/report ERROR:', err);
    res.status(500).json({ error: 'LLM error on report', details: err.message || err });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🩺 Therapy API listening on http://localhost:${PORT}`);
});