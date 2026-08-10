const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/ui-preview', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const outDir = path.join(process.cwd(), 'public', 'ui-preview', 'screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await page.screenshot({
    path: path.join(outDir, 'full-page.png'),
    fullPage: true,
  });

  const sections = [
    { id: 'preview-02', name: '02-workbench' },
    { id: 'preview-03', name: '03-fabric-dna' },
    { id: 'preview-04', name: '04-square' },
  ];

  for (const s of sections) {
    const el = await page.$(`section#${s.id}`);
    if (el) {
      await el.screenshot({
        path: path.join(outDir, `${s.name}.png`),
        type: 'png',
      });
      console.log(`Captured ${s.name}`);
    } else {
      console.log(`Section ${s.id} not found`);
    }
  }

  await browser.close();
  console.log('Done');
})();
