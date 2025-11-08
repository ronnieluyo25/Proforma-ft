// api/pdf.js
const fs = require('fs');
const path = require('path');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

/* Recomendaciones de @sparticuz */
chromium.setHeadlessMode = true;    // headless real
chromium.setGraphicsMode = false;   // sin aceleración

async function launchBrowser() {
  const executablePath = await chromium.executablePath(); // <- binario correcto
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless
  });
}

/* Utils */
const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const num = (n, d=2) => Number(n||0).toFixed(d);
const PEN = n => `S/ ${Number(n||0).toFixed(2)}`;
function todayPE(){ const d=new Date(); return d.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'}); }
const rowsHTML = (rows=[]) => rows.map(r=>`
  <tr>
    <td>${esc(r.fecha)}</td><td>${esc(r.dia)}</td><td>${esc(r.tutor)}</td><td>${esc(r.modalidad)}</td>
    <td class="num">${num(r.horas)}</td><td class="num">${num(r.precioHora)}</td><td class="num strong">${PEN(r.importe)}</td>
  </tr>`).join('');

module.exports = async (req, res) => {
  try {
    // TEST: /api/pdf?test=1 (descarta problema de binario)
    if (req.method === 'GET' && req.query.test === '1') {
      const browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setContent(`<html><body style="font-family:system-ui;padding:24px">
        <h1>PDF OK</h1><p>Puppeteer + @sparticuz/chromium funcionando</p>
      </body></html>`, { waitUntil: 'load' });
      const buf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      return res.status(200).send(buf);
    }

    // Plantillas
    let htmlTpl, cssTpl;
    try {
      htmlTpl = fs.readFileSync(path.join(process.cwd(), 'templates/proforma.html'), 'utf8');
      cssTpl  = fs.readFileSync(path.join(process.cwd(), 'templates/proforma.css'), 'utf8');
    } catch (e) {
      return res.status(500).json({ error: 'TEMPLATE_READ_FAIL', detail: String(e?.message || e) });
    }

    // Payload
    let payload = {};
    if (req.method === 'POST') {
      const chunks = []; for await (const c of req) chunks.push(c);
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
      catch(e){ return res.status(400).json({ error:'BAD_JSON', detail:String(e?.message||e) }); }
    } else {
      payload = {
        alumno: req.query.alumno || 'Alumno Demo',
        tutor: req.query.tutor || 'Tutor Demo',
        paquete: req.query.paquete || '5 sesiones – 7.5 h',
        filas: [
          { fecha:'01/12/2025', dia:'Lunes', tutor:'Juan Pérez', modalidad:'Presencial', horas:1.5, precioHora:60, importe:90 },
          { fecha:'03/12/2025', dia:'Miércoles', tutor:'Juan Pérez', modalidad:'Presencial', horas:1.5, precioHora:60, importe:90 }
        ]
      };
    }

    const { alumno='', tutor='', paquete='', filas=[], totales={} } = payload;
    const totalHoras   = totales.totalHoras   ?? filas.reduce((a,b)=>a+Number(b.horas||0),0);
    const totalImporte = totales.totalImporte ?? filas.reduce((a,b)=>a+Number(b.importe||0),0);

    const html = htmlTpl
      .replace('{{INLINE_STYLES}}', `<style>${cssTpl}</style>`)
      .replace('{{FECHA_HOY}}', esc(todayPE()))
      .replace('{{ALUMNO}}', esc(alumno))
      .replace('{{TUTOR}}', esc(tutor))
      .replace('{{PAQUETE}}', esc(paquete))
      .replace('{{TABLE_ROWS}}', rowsHTML(filas))
      .replace('{{TOTAL_HORAS}}', num(totalHoras))
      .replace('{{TOTAL_IMPORTE}}', esc(PEN(totalImporte)));

    // Render PDF
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '14mm', bottom: '18mm', left: '14mm' }
    });
    await browser.close();

    const safe = String(alumno||'Alumno').replace(/[\\/:*?"<>|]+/g,'_');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Proforma_${safe}.pdf"`);
    return res.status(200).send(buf);

  } catch (e) {
    return res.status(500).json({ error: 'PDF_ERROR', detail: String(e?.message || e) });
  }
};
