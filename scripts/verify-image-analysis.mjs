import { readFile } from 'node:fs/promises';
import path from 'node:path';

const imagePath = path.resolve(process.cwd(), 'image.png');
const bytes = await readFile(imagePath);
const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;

const body = {
  mode: 'initial',
  text: '需要一款适合夏季户外运动的轻量透气面料，颜色偏深蓝，要求防泼水，起订量 3000 米',
  images: [{ name: 'image.png', dataUrl, imageHash: 'image-test' }]
};

const res = await fetch('http://127.0.0.1:3000/api/bunana/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const data = await res.json();
console.log(JSON.stringify({
  status: res.status,
  success: data.success,
  aiProvider: data.aiProvider,
  hasDna: Boolean(data.dna),
  dnaFields: data.dna ? Object.keys(data.dna) : [],
  followUpQuestions: data.followUpQuestions?.slice(0, 3),
  summary: data.summary,
  confidence: data.confidence
}, null, 2));
