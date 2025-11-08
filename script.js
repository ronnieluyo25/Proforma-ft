"use strict";

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function esc(str){const s=String(str??'');return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function toDMY(d){return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}
function round2(n){return Math.round((Number(n||0)+Number.EPSILON)*100)/100;}
function toNum(v){return parseFloat(String(v??'').replace(/[^0-9.\-]/g,''))||0;}
const DIAS=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

async function cargarSelect(url,sel){try{const r=await fetch(url);const d=await r.json();sel.innerHTML=d.map(it=>`<option>${esc(it.nombre)}</option>`).join('')}catch{sel.innerHTML='<option>(error)</option>'}}

function renderDetalle(rows){
  const thead=$('#tabla thead'),tbody=$('#tabla tbody'),tfoot=$('#tabla tfoot');
  thead.innerHTML=`<tr><th>Fecha</th><th>Día</th><th>Tutor</th><th>Modalidad</th><th>Horas</th><th>Precio x Hora</th><th>Importe</th></tr>`;
  tbody.innerHTML=rows.map(r=>`<tr><td>${r.fecha}</td><td>${r.dia}</td><td>${r.tutor}</td><td>${r.modalidad}</td>
  <td>${r.horas.toFixed(2)}</td><td>S/ ${r.precioHora.toFixed(2)}</td><td>S/ ${r.importe.toFixed(2)}</td></tr>`).join('');
  const totalHoras=rows.reduce((a,b)=>a+b.horas,0),totalImporte=rows.reduce((a,b)=>a+b.importe,0);
  tfoot.innerHTML=`<tr><td colspan="4" class="text-right font-semibold">TOTAL DE HORAS</td>
  <td>${totalHoras.toFixed(2)}</td><td>TOTAL A PAGAR</td><td class="text-blue-700 font-semibold">S/ ${totalImporte.toFixed(2)}</td></tr>`;
}

function generarProforma(){
  const n=Number($('#secciones').value||1);
  const fecha=new Date($('#fechaInicio').value);
  const alumno=$('#alumno').value,tutor=$('#tutor').value,modalidad=$('#modalidad').value;
  const horas=toNum($('#horasClase').value),precio=toNum($('#precioHora').value);
  const dias=$$('#dias input:checked').map(i=>i.value);
  if(!alumno||!tutor||!modalidad||isNaN(fecha)||!dias.length)return alert('Completa los campos.');

  const filas=[];let d=new Date(fecha);
  while(filas.length<n){if(dias.includes(DIAS[d.getDay()]))filas.push({
    fecha:toDMY(d),dia:DIAS[d.getDay()],tutor,modalidad,horas,precioHora:precio,importe:round2(horas*precio)
  });d.setDate(d.getDate()+1);}

  $('#phAlumno').textContent=alumno;$('#phTutor').textContent=tutor;
  $('#phPaquete').textContent=`${n} sesiones - ${(n*horas).toFixed(2)} horas totales`;
  renderDetalle(filas);
  $('#exportArea').classList.remove('hidden');$('#pdfBtn').disabled=false;
}

function descargarPDF(){
  const area=document.getElementById('exportArea');
  const alumnoSel=document.getElementById('alumno')?.value||'Alumno';

  const opt={
    margin:[10,10,10,10],
    filename:`Proforma_${alumnoSel}.pdf`,
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,logging:false,windowWidth:720,width:720},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
    pagebreak:{mode:['css','legacy']}
  };
  html2pdf().set(opt).from(area).save();
}

window.addEventListener('DOMContentLoaded',async()=>{
  $('#hoy').textContent=new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
  const c=$('#dias');DIAS.forEach(d=>{const l=document.createElement('label');l.className='flex items-center gap-2 text-sm';
  l.innerHTML=`<input type="checkbox" class="accent-blue-600" value="${d}">${d}`;c.appendChild(l)});
  $('#fechaInicio').valueAsDate=new Date();
  await cargarSelect('/api/alumnos',$('#alumno'));await cargarSelect('/api/tutores',$('#tutor'));
  $('#generarBtn').onclick=generarProforma;$('#pdfBtn').onclick=descargarPDF;
});
