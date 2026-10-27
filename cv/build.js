// Builds the downloadable CVs from cv/cv-*.html: `node cv/build.js` (needs Playwright with Chromium).
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const docs = [
  ['cv-en.html', 'Artem_Iskandirov_CV_EN.pdf'],
  ['cv-ru.html', 'Artem_Iskandirov_CV_RU.pdf'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [src, out] of docs) {
    await page.goto('file://' + path.join(__dirname, src), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ path: path.join(root, out), preferCSSPageSize: true, printBackground: true, tagged: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log(out + ': ' + pages + (pages === 1 ? ' page' : ' pages — the CV should fit on one'));
  }
  await browser.close();
})();
