"use strict";
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const toNum=v=>parseFloat(String(v??'').replace(/[^0-9.\-]/g,''))||0;
const toDMY=d=>`${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
const DIAS=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

async function cargarSelect(url,sel){
  try{const r=await fetch(url);const j=await r.json();
    sel.innerHTML=j.map(x=>`<option>${x.nombre}</option>`).join('');
  }catch{sel.innerHTML='<option>(sin datos)</option>';}
}

function renderDetalle(rows){
  const t=$('#tabla');
  const head=`<thead class="no-break"><tr><th>Fecha</th><th>Día</th><th>Tutor</th><th>Modalidad</th><th>Horas</th><th>Precio x Hora</th><th>Importe</th></tr></thead>`;
  const body=rows.map(r=>`<tr><td>${r.fecha}</td><td>${r.dia}</td><td>${r.tutor}</td><td>${r.modalidad}</td><td>${r.horas.toFixed(2)}</td><td>S/ ${r.precioHora.toFixed(2)}</td><td>S/ ${r.importe.toFixed(2)}</td></tr>`).join('');
  const totH=rows.reduce((a,b)=>a+b.horas,0), totI=rows.reduce((a,b)=>a+b.importe,0);
  const foot=`<tfoot><tr><td colspan="4">TOTAL HORAS</td><td>${totH.toFixed(2)}</td><td>TOTAL</td><td>S/ ${totI.toFixed(2)}</td></tr></tfoot>`;
  t.innerHTML = head + `<tbody>${body}</tbody>` + foot;
}

function generarProforma(){
  const alumno=$('#alumno').value, tutor=$('#tutor').value, mod=$('#modalidad').value;
  const h=toNum($('#horasClase').value), p=toNum($('#precioHora').value);
  const n=Number($('#secciones').value), f=new Date($('#fechaInicio').value);
  const dias=$$('#dias input:checked').map(x=>x.value);
  if(!alumno||!tutor||!mod||isNaN(f)||!dias.length){alert('Completa los campos.');return;}

  const filas=[];let d=new Date(f);
  while(filas.length<n){
    if(dias.includes(DIAS[d.getDay()])){
      filas.push({fecha:toDMY(d),dia:DIAS[d.getDay()],tutor,modalidad:mod,horas:h,precioHora:p,importe:h*p});
    }
    d.setDate(d.getDate()+1);
  }
  renderDetalle(filas);
  $('#phAlumno').textContent=alumno;
  $('#phTutor').textContent=tutor;
  $('#phPaquete').textContent=`${n} sesiones - ${(n*h).toFixed(2)} horas totales`;
  $('#exportArea').classList.remove('hidden');
  $('#pdfBtn').disabled=false;
}

function descargarPDF(){
  const area=$('#exportArea');
  // Asegurar captura completa y proporción correcta
  const opt={
    margin:[10,10,10,10],
    filename:'Proforma_FriendTeacher.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,scrollY:0,windowWidth:720,width:720},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
    pagebreak:{mode:['css','legacy']}
  };
  html2pdf().set(opt).from(area).save();
}

window.addEventListener('DOMContentLoaded',async()=>{
  const hoy=new Date();$('#hoy').textContent=hoy.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'});
  const dCont=$('#dias');DIAS.forEach(d=>{const l=document.createElement('label');l.className='flex items-center gap-2 text-sm';l.innerHTML=`<input type="checkbox" class="accent-blue-600" value="${d}"> ${d}`;dCont.appendChild(l);});
  $('#fechaInicio').valueAsDate=hoy;
  await cargarSelect('/api/alumnos',$('#alumno'));
  await cargarSelect('/api/tutores',$('#tutor'));
  $('#generarBtn').addEventListener('click',generarProforma);
  $('#pdfBtn').addEventListener('click',descargarPDF);
});
