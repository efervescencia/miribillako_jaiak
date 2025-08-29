const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_rQI15YfKRWEizmqgicHivibosHIHcd6zNVQVjR7HCUUbjS__F42MS-sIMtOnbMOvoaplkjVURBDa/pub?output=csv";

let lang = 'es'; // 'es' para español, 'eus' para euskera
let eventos = [];
let dias = [];
let tipos = [];
let lugares = [];
let filtros = {
  dia: '',
  tipo: '',
  lugar: '',
  hora_ini: '',
  hora_fin: '',
  texto: ''
};

const textos = {
  es: {
    titulo: "Fiestas de Miribilla",
    galeria: "Galería de las Fiestas",
    mapa: "🗺️ Ver mapa del barrio",
    tieneFotos: "¿Tienes fotos?",
    envialas: "¡Sube tu foto aquí!",
    enviarFooter: "Web creada con",
    dia: "Día",
    tipo: "Tipo",
    lugar: "Lugar",
    hora: "Hora entre",
    buscar: "Buscar",
    limpiar: "Limpiar",
    todos: "Todos",
    noEventosFiltro: "No hay eventos para este filtro.",
    footer: "© Fiestas del Barrio. Web creada con"
  },
  eus: {
    titulo: "Auzoko Jaiak",
    galeria: "Jaietako galeria",
    mapa: "🗺️ Auzoko mapa ikusi",
    tieneFotos: "Argazkirik?",
    envialas: "Bidali hemen!",
    enviarFooter: "Web sortua",
    dia: "Eguna",
    tipo: "Mota",
    lugar: "Lekua",
    hora: "Ordua",
    buscar: "Bilatu",
    limpiar: "Garbitu",
    todos: "Guztiak",
    noEventosFiltro: "Ez dago ekitaldirik filtro honekin.",
    footer: "© Auzoko jaiak. Web sortua"
  }
};

function setLang(l) {
  lang = l;
  document.getElementById('titulo').innerText = textos[lang].titulo;
  document.getElementById('map-link').innerText = textos[lang].mapa;
  document.getElementById('foto-form-text').innerText = textos[lang].envialas;
  document.getElementById('footer-text').innerHTML = `${textos[lang].footer} <a href="https://github.com/efervescencia/fiestas-barrio" target="_blank">GitHub Pages</a>`;
  renderFiltros();
  // Actualiza el día activo al primer día en el idioma seleccionado
  if (dias.length) {
    diaActivo = dias[0];
  } else {
    diaActivo = null;
  }
  renderDiasNav();
  renderPrograma();
}

// Convierte enlaces Drive "file/d/ID/view" en "uc?export=view&id=ID"
function getRealImageUrl(url) {
  const match = url.match(/drive\.google\.com\/file\/d\/([^\/]+)\//);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
}

// CSV robusto
function parseCSV(csv) {
  const lines = [];
  let curLine = [];
  let curCell = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    let char = csv[i];
    if (inQuotes) {
      if (char === '"') {
        if (csv[i + 1] === '"') {
          curCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        curCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        curLine.push(curCell);
        curCell = '';
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        curLine.push(curCell);
        lines.push(curLine);
        curLine = [];
        curCell = '';
      } else {
        curCell += char;
      }
    }
  }
  if (curCell.length > 0 || curLine.length > 0) {
    curLine.push(curCell);
    lines.push(curLine);
  }
  return lines;
}

async function fetchEventos() {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) {
      console.error("Error al descargar el archivo CSV:", res.status, res.statusText);
      return;
    }
    const csv = await res.text();
    const rows = parseCSV(csv);
    const head = rows[0];
    eventos = [];
    dias = [];
    tipos = [];
    lugares = [];
    for(let i=1; i < rows.length; i++) {
      let obj = {};
      head.forEach((h, idx) => { obj[h.trim()] = rows[i][idx] ? rows[i][idx].trim() : ""; });
      if(obj[`dia_${lang}`] && !dias.includes(obj[`dia_${lang}`])) dias.push(obj[`dia_${lang}`]);
      if(obj[`tipo_evento_${lang}`] && !tipos.includes(obj[`tipo_evento_${lang}`])) tipos.push(obj[`tipo_evento_${lang}`]);
      if(obj[`lugar_${lang}`] && !lugares.includes(obj[`lugar_${lang}`])) lugares.push(obj[`lugar_${lang}`]);
      eventos.push(obj);
    }
    renderFiltros();
    renderDiasNav();
    renderPrograma();
  } catch (err) {
    console.error("Error al cargar y procesar el archivo CSV:", err);
  }
}

function renderFiltros() {
  const f = filtros;
  const t = textos[lang];
  const cont = document.getElementById('filtros');
  cont.innerHTML = `
    <label>${t.dia}:
      <select id="filtro-dia" onchange="onFiltroChange('dia', this.value)">
        <option value="">${t.todos}</option>
        ${dias.map(d => `<option value="${d}" ${f.dia===d?"selected":""}>${d}</option>`).join("")}
      </select>
    </label>
    <label>${t.tipo}:
      <select id="filtro-tipo" onchange="onFiltroChange('tipo', this.value)">
        <option value="">${t.todos}</option>
        ${tipos.map(tp => `<option value="${tp}" ${f.tipo===tp?"selected":""}>${tp}</option>`).join("")}
      </select>
    </label>
    <label>${t.lugar}:
      <select id="filtro-lugar" onchange="onFiltroChange('lugar', this.value)">
        <option value="">${t.todos}</option>
        ${lugares.map(l => `<option value="${l}" ${f.lugar===l?"selected":""}>${l}</option>`).join("")}
      </select>
    </label>
    <label>${t.hora}:
      <input type="time" id="filtro-hora-ini" value="${f.hora_ini}" onchange="onFiltroChange('hora_ini', this.value)" style="width:90px">
      -
      <input type="time" id="filtro-hora-fin" value="${f.hora_fin}" onchange="onFiltroChange('hora_fin', this.value)" style="width:90px">
    </label>
    <label>${t.buscar}:
      <input type="text" id="filtro-texto" placeholder="${t.buscar}..." value="${f.texto}" oninput="onFiltroChange('texto', this.value)" style="width:130px">
    </label>
    <button onclick="resetFiltros()" style="padding:4px 10px; border-radius:4px; border:none; background:#ff9800; color:#fff; font-weight:bold;">${t.limpiar}</button>
  `;
}

// Para onchange dinámico
window.onFiltroChange = function(key, val) {
  filtros[key] = val;
  renderPrograma();
};

window.resetFiltros = function() {
  filtros = {dia:'', tipo:'', lugar:'', hora_ini:'', hora_fin:'', texto:''};
  renderFiltros();
  renderPrograma();
};

let diaActivo = null;
function renderDiasNav() {
  const nav = document.getElementById('dias-nav');
  nav.innerHTML = '';
  dias.forEach(dia => {
    const btn = document.createElement('button');
    btn.innerText = dia;
    btn.className = dia === diaActivo ? 'active' : '';
    btn.onclick = () => { diaActivo = dia; renderPrograma(); renderDiasNav(); };
    nav.appendChild(btn);
  });
  if(!diaActivo && dias.length) diaActivo = dias[0];
}

// Filtro eventos multilingüe
function filtrarEventos(ev) {
  if(filtros.dia && ev[`dia_${lang}`] !== filtros.dia) return false;
  if(filtros.tipo && ev[`tipo_evento_${lang}`] !== filtros.tipo) return false;
  if(filtros.lugar && ev[`lugar_${lang}`] !== filtros.lugar) return false;
  if(filtros.hora_ini || filtros.hora_fin) {
    let horaEv = ev.hora.split(';')[0].trim();
    if(filtros.hora_ini && horaEv < filtros.hora_ini) return false;
    if(filtros.hora_fin && horaEv > filtros.hora_fin) return false;
  }
  if(filtros.texto) {
    let txt = filtros.texto.toLowerCase();
    let busqueda = [
      ev[`evento_${lang}`],
      ev[`descripcion_${lang}`],
      ev[`lugar_${lang}`]
    ].join(' ').toLowerCase();
    if(!busqueda.includes(txt)) return false;
  }
  if(ev[`dia_${lang}`] !== diaActivo) return false;
  return true;
}

// Tarjetas multilingües
function renderPrograma() {
  const main = document.getElementById('programa');
  const t = textos[lang];
  main.innerHTML = '';
  let filtrados = eventos.filter(filtrarEventos);
  if(filtrados.length === 0) {
    main.innerHTML = `<p style="color:#ff3b3f;">${t.noEventosFiltro}</p>`;
    return;
  }
  filtrados.forEach(ev => {
    const card = document.createElement('div');
    card.className = `evento-card ${lang}`;
    card.innerHTML = `
      <h3>${ev[`evento_${lang}`]}</h3>
      <p>
        <b>${ev.hora}</b> -
        <b>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev[`lugar_${lang}`])}" target="_blank">
            ${ev[`lugar_${lang}`]}
          </a>
        </b>
        ${ev[`tipo_evento_${lang}`] ? `<span style="margin-left:10px;padding:2px 8px;background:#ff9800;color:#fff;border-radius:8px;font-size:.9em;">${ev[`tipo_evento_${lang}`]}</span>` : ""}
      </p>
      <p>${ev[`descripcion_${lang}`]}</p>
      <div class="imagenes"></div>
    `;
    if(ev.imagenes) {
      const imgDiv = card.querySelector('.imagenes');
      ev.imagenes.split(';').forEach(imgUrl => {
        const realUrl = getRealImageUrl(imgUrl.trim());
        if(realUrl)
          imgDiv.innerHTML += `<img src="${realUrl}" alt="Foto evento">`;
      });
    }
    main.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setLang('es');
  fetchEventos();
});