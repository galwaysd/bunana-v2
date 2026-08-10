import { readFile } from 'node:fs/promises';
import path from 'node:path';

const imagePath = path.resolve(process.cwd(), 'image.png');
const bytes = await readFile(imagePath);
const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;

async function post(body) {
  const res = await fetch('http://127.0.0.1:3000/api/bunana/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { res, data };
}

const initial = await post({
  mode: 'initial',
  text: '需要一款适合夏季户外运动的轻量透气面料，颜色偏深蓝，要求防泼水，起订量 3000 米',
  images: [{ name: 'image.png', dataUrl, imageHash: 'image-test' }]
});

console.log('INITIAL', JSON.stringify({
  status: initial.res.status,
  success: initial.data.success,
  aiProvider: initial.data.aiProvider,
  followUpQuestions: initial.data.followUpQuestions?.slice(0, 2),
  dnaKeys: initial.data.dna ? Object.keys(initial.data.dna) : []
}, null, 2));

if (!initial.data.success || !initial.data.followUpQuestions?.length) {
  process.exit(0);
}

const firstQuestion = initial.data.followUpQuestions[0];
const refine = await post({
  mode: 'refine',
  currentDNA: initial.data.dna,
  question: firstQuestion,
  answer: '牛津布',
  answeredLog: {}
});

console.log('REFINE', JSON.stringify({
  status: refine.res.status,
  success: refine.data.success,
  error: refine.data.error,
  aiProvider: refine.data.aiProvider,
  followUpQuestions: refine.data.followUpQuestions?.slice(0, 3),
  dnaFabricName: refine.data.dna?.fabricName?.value
}, null, 2));
