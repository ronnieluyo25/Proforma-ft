"use strict";

/* ======== Helpers ======== */
const $ = (s)=>document.querySelector(s);
const $$= (s)=>Array.from(document.querySelectorAll(s));
const esc = s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const toDMY = d=>`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
const round2=n=>Math.round((Number(n||0)+Number.EPSILON)*100)/100;
const toNum=v=>{const s=String(v??'').replace(/[^0-9.\-]/g,''); const n=parseFloat(s); return isNaN(n)?0:n;};
const clampInt=(v,min,max)=>{v=parseInt(v,10); if(isNaN(v)) v=min; return Math.max(min,Math.min(max,v));};
const DIAS=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

/* ======== Estado global ======== */
window.FILAS_ACTUALES = [];
window.META_ACTUAL = { alumno:'', tutor:'', paquete:'' };

/* Porcentajes de columnas (suman ~100) */
let COL_WIDTHS = [16,12,20,16,10,12,14]; // [Fecha, Día, Tutor, Modalidad, Horas, Precio, Importe]

/* ======== Cargar selects desde API ======== */
async function cargarSelect(url, selectEl, labelKey='nombre'){
  try{
    const res = await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    selectEl.innerHTML = data.map(it=>`<option value="${esc(it[labelKey])}">${esc(it[labelKey])}</option>`).join('');
  }catch(e){
    console.error('Error cargando',url,e);
    selectEl.innerHTML = `<option value="">(sin datos)</option>`;
  }
}

/* ======== Construir <colgroup> por porcentajes ======== */
function buildColgroup(colsPerc){
  const total = colsPerc.reduce((a,b)=>a+Number(b||0),0) || 1;
  const norm = colsPerc.map(v=> (Number(v||0)/total*100));
  return `<colgroup>${norm.map(p=>`<col style="width:${p.toFixed(3)}%;">`).join('')}</colgroup>`;
}

/* ======== Render tabla ======== */
function renderDetalle(rows){
  const table = $('#tabla');
  const thead = $('#tabla thead');
  const tbody = $('#tabla tbody');
  const tfoot = $('#tabla tfoot');
  if(!table || !thead || !tbody || !tfoot) return;

  table.innerHTML = `${buildColgroup(COL_WIDTHS)}<thead></thead><tbody></tbody><tfoot></tfoot>`;

  $('#tabla thead').innerHTML = `
    <tr>
      <th>Fecha</th><th>Día</th><th>Tutor</th>
      <th>Modalidad</th>
      <th class="text-right">Horas</th>
      <th class="text-right">Precio x Hora</th>
      <th class="text-right">Importe</th>
    </tr>`;

  $('#tabla tbody').innerHTML = rows.map(r=>`
    <tr>
      <td>${esc(r.fecha)}</td>
      <td>${esc(r.dia)}</td>
      <td>${esc(r.tutor)}</td>
      <td>${esc(r.modalidad)}</td>
      <td class="text-right">${Number(r.horas||0).toFixed(2)}</td>
      <td class="text-right">S/ ${Number(r.precioHora||0).toFixed(2)}</td>
      <td class="text-right font-semibold">S/ ${Number(r.importe||0).toFixed(2)}</td>
    </tr>`).join('');

  const totalHoras = rows.reduce((a,b)=>a+Number(b.horas||0),0);
  const totalImporte = rows.reduce((a,b)=>a+Number(b.importe||0),0);
  $('#tabla tfoot').innerHTML = `
    <tr>
      <td colspan="4" class="text-right font-semibold">TOTAL DE HORAS</td>
      <td class="text-right font-semibold">${totalHoras.toFixed(2)}</td>
      <td class="text-right font-semibold">TOTAL A PAGAR</td>
      <td class="text-right font-semibold text-blue-700">S/ ${totalImporte.toFixed(2)}</td>
    </tr>`;
}

/* ======== Generar Proforma ======== */
function generarProforma(){
  const nSecciones = clampInt($('#secciones')?.value,1,500);
  const fechaStr   = $('#fechaInicio')?.value || '';
  const alumno     = $('#alumno')?.value || '';
  const tutor      = $('#tutor')?.value || '';
  const modalidad  = $('#modalidad')?.value || '';
  const horasClase = toNum($('#horasClase')?.value);
  const precioHora = toNum($('#precioHora')?.value);
  const diasMarcados = $$('#dias input:checked').map(i=>i.value);

  const start = new Date(fechaStr);
  const fechaValida = !isNaN(start.getTime());
  if(!alumno || !tutor || !modalidad || !fechaValida || diasMarcados.length===0){ alert('Completa todos los campos y marca al menos un día.'); return; }
  if(!(horasClase>0) || !(precioHora>=0)){ alert('Horas y precio deben ser válidos.'); return; }

  const filas=[];
  let d=new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while(filas.length<nSecciones){
    const dowName = DIAS[d.getDay()];
    if(diasMarcados.includes(dowName)){
      const horas=round2(horasClase), precio=round2(precioHora), importe=round2(horas*precio);
      filas.push({ fecha:toDMY(d), dia:dowName, tutor, modalidad, horas, precioHora:precio, importe });
    }
    d.setDate(d.getDate()+1);
  }

  const totalHoras = filas.reduce((a,b)=>a+Number(b.horas||0),0);
  $('#phAlumno').textContent = alumno;
  $('#phTutor').textContent  = tutor;
  $('#phPaquete').textContent= `${nSecciones} ${nSecciones===1?'sesión':'sesiones'} - ${totalHoras.toFixed(2)} horas totales`;

  window.FILAS_ACTUALES = filas;
  window.META_ACTUAL = { alumno, tutor, paquete: `${nSecciones} ${nSecciones===1?'sesión':'sesiones'} - ${totalHoras.toFixed(2)} horas totales` };

  renderDetalle(filas);
  $('#exportArea').classList.remove('hidden');
  $('#pdfBtn').disabled = filas.length===0;
  $('#pdfSrvBtn').disabled= filas.length===0;
}

/* ======== PDF Cliente (html2pdf) ======== */
function descargarPDF(){
  const area = document.getElementById('exportArea');
  if(!area) return;

  // salto limpio antes de Consideraciones si hiciera falta
  const cons = document.getElementById('consideraciones');
  let pageBreakEl = null;
  if(cons){
    pageBreakEl = document.createElement('div');
    pageBreakEl.className = 'html2pdf__page-break';
    cons.parentNode.insertBefore(pageBreakEl, cons);
  }

  const alumnoSel = $('#alumno')?.value || 'Alumno';
  const alumnoSafe = String(alumnoSel).replace(/[\\/:*?"<>|]+/g,'_');

  const width = area.offsetWidth; // clave: usar el ancho REAL del bloque angosto
  const opt = {
    margin: [10,10,12,10],
    filename: `Proforma_${alumnoSafe}.pdf`,
    image: { type:'jpeg', quality:0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: width,
      width      : width
    },
    jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
    pagebreak: { mode:['css','legacy'] }
  };

  requestAnimationFrame(()=>{
    html2pdf().set(opt).from(area).save().then(()=>{
      if(pageBreakEl?.parentNode) pageBreakEl.parentNode.removeChild(pageBreakEl);
    }).catch(()=>{
      if(pageBreakEl?.parentNode) pageBreakEl.parentNode.removeChild(pageBreakEl);
    });
  });
}

/* ======== PDF Servidor (/api/pdf) ======== */
async function descargarPDFServidor(){
  const { alumno, tutor, paquete } = window.META_ACTUAL || {};
  const filas = window.FILAS_ACTUALES || [];
  if(!filas.length){ alert('Primero genera la proforma.'); return; }

  const totales = {
    totalHoras: filas.reduce((a,b)=>a+Number(b.horas||0),0),
    totalImporte: filas.reduce((a,b)=>a+Number(b.importe||0),0)
  };

  const resp = await fetch('/api/pdf', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ alumno, tutor, paquete, filas, totales })
  });

  if(!resp.ok){
    const txt = await resp.text();
    alert('No se pudo generar el PDF en servidor.\n\n'+txt.slice(0,400));
    return;
  }
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`Proforma_${String(alumno||'Alumno').replace(/[\\/:*?"<>|]+/g,'_')}.pdf`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ======== Aplicar anchos de columnas desde inputs ======== */
function aplicarColumnasDesdeUI(){
  const vals = [$('#cw1'),$('#cw2'),$('#cw3'),$('#cw4'),$('#cw5'),$('#cw6'),$('#cw7')].map(i=> Number(i.value||0));
  const sum = vals.reduce((a,b)=>a+(isNaN(b)?0:b),0);
  const msg = $('#cwMsg');

  if(sum <= 0){ msg.textContent='Valores inválidos.'; return; }
  COL_WIDTHS = vals; // guardamos tal cual (normalizamos al render)
  msg.textContent = `Aplicado. Suma: ${sum}% (se normaliza automáticamente a 100%).`;

  // Re-render si ya hay filas
  if(window.FILAS_ACTUALES?.length) renderDetalle(window.FILAS_ACTUALES);
}

/* ======== Init ======== */
window.addEventListener('DOMContentLoaded', async ()=>{
  const hoy = new Date();
  $('#hoy').textContent = hoy.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});

  const contDias=$('#dias');
  DIAS.forEach(d=>{
    const lbl=document.createElement('label');
    lbl.className='flex items-center gap-2 text-sm';
    lbl.innerHTML=`<input type="checkbox" class="accent-blue-600" value="${esc(d)}"> ${esc(d)}`;
    contDias.appendChild(lbl);
  });
  $('#fechaInicio').valueAsDate = hoy;

  await cargarSelect('/api/alumnos', $('#alumno'));
  await cargarSelect('/api/tutores', $('#tutor'));

  $('#generarBtn').addEventListener('click', generarProforma);
  $('#pdfBtn').addEventListener('click', descargarPDF);
  $('#pdfSrvBtn').addEventListener('click', descargarPDFServidor);
  $('#aplicarWidths').addEventListener('click', aplicarColumnasDesdeUI);
});
