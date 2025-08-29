const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_rQI15YfKRWEizmqgicHivibosHIHcd6zNVQVjR7HCUUbjS__F42MS-sIMtOnbMOvoaplkjVURBDa/pub?output=csv";

let lang = 'es'; // 'es' para español, 'eus' para euskera
let eventos = [];
let dias = [];
let tipos = [];
let lugares = [];
let filtros = {
  tipo: '',
  lugar: '',
  hora_ini: '',
  hora_fin: '',
  texto: ''
};

const textos = {
  es: {
    titulo: "Fiestas de Miribilla 2025",
    galeria: "Galería de las Fiestas",
    mapa: "🗺️ Ver mapa del barrio",
    tieneFotos: "¿Quieres compartir fotos?",
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
    footer: "© Fiestas de Miribilla. Web creada con"
  },
  eus: {
    titulo: "2025ko Miribillako Jaiak",
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
    footer: "© Miribillako jaiak. Web sortua"
  }
};

function setLang(l) {
  lang = l;

  const titulo = document.getElementById('titulo');
  if (titulo) titulo.innerText = textos[lang].titulo;
  const mapLink = document.getElementById('map-link');
  if (mapLink) mapLink.innerText = textos[lang].mapa;
  const fotoFormText = document.getElementById('foto-form-text');
  if (fotoFormText) fotoFormText.innerText = textos[lang].envialas;
  const footerText = document.getElementById('footer-text');
  if (footerText) footerText.innerHTML = `${textos[lang].footer} <a href="https://github.com/efervescencia/fiestas-barrio" target="_blank">GitHub Pages</a>`;

  // RECONSTRUYE arrays en el idioma actual
  dias = [];
  tipos = [];
  lugares = [];
  eventos.forEach(obj => {
    if(obj[`dia_${lang}`] && !dias.includes(obj[`dia_${lang}`])) dias.push(obj[`dia_${lang}`]);
    if(obj[`tipo_evento_${lang}`] && !tipos.includes(obj[`tipo_evento_${lang}`])) tipos.push(obj[`tipo_evento_${lang}`]);
    if(obj[`lugar_${lang}`] && !lugares.includes(obj[`lugar_${lang}`])) lugares.push(obj[`lugar_${lang}`]);
  });

  // Ya no selecciona automáticamente ningún día
  diaActivo = null;

  renderFiltros();
  renderDiasNav();
  renderPrograma();
}

// Convierte enlaces Drive "file/d/ID/view" en "uc?export=view&id=ID"
function getRealImageUrl(url) {
  // Si es Drive
  const match = url.match(/drive\.google\.com\/file\/d\/([^\/]+)\//);
  if (match) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  // Si es una URL completa (http/https), devuélvela tal cual
  if (/^https?:\/\//.test(url)) {
    return url;
  }
  // Si es solo el nombre (sin barra y sin punto), ignora
  if (!url || !url.trim()) return "";
  // Si ya contiene una ruta (por ejemplo img/...), devuélvela tal cual
  if (url.includes('/')) return url;
  // Si es solo nombre de archivo
  return `img/eventos/${url}`;
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
    diaActivo = null;
    renderFiltros();
    renderDiasNav();
    renderPrograma();
  } catch (err) {
    console.error("Error al cargar y procesar el archivo CSV:", err);
  }
}

// FILTROS SIN SELECTOR DE DÍA
function renderFiltros() {
  const f = filtros;
  const t = textos[lang];
  const cont = document.getElementById('filtros');
  cont.innerHTML = `
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
  filtros = {tipo:'', lugar:'', hora_ini:'', hora_fin:'', texto:''};
  renderFiltros();
  renderPrograma();
};

let diaActivo = null;
function renderDiasNav() {
  const nav = document.getElementById('dias-nav');
  nav.innerHTML = '';

  // Botón "Todos" al inicio
  const btnTodos = document.createElement('button');
  btnTodos.innerText = textos[lang].todos;
  btnTodos.className = diaActivo === null ? 'active' : '';
  btnTodos.onclick = () => {
    diaActivo = null;
    renderPrograma();
    renderDiasNav();
  };
  nav.appendChild(btnTodos);

  dias.forEach(dia => {
    const btn = document.createElement('button');
    btn.innerText = dia;
    btn.className = dia === diaActivo ? 'active' : '';
    btn.onclick = () => {
      diaActivo = dia;
      renderPrograma();
      renderDiasNav();
    };
    nav.appendChild(btn);
  });
}

// Filtro eventos multilingüe
function filtrarEventos(ev) {
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
  if(diaActivo !== null && ev[`dia_${lang}`] !== diaActivo) return false;
  return true;
}

// Tarjetas multilingües con imagen a la derecha
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
    // Preparamos la imagen lateral (solo la primera si hay varias)
    let imagenesHTML = '';
    if(ev.imagenes) {
      const urls = ev.imagenes.split(';').map(u => getRealImageUrl(u.trim())).filter(u => u);
      if(urls.length) {
        imagenesHTML = `<img src="${urls[0]}" alt="Foto evento" class="evento-img-lateral" onclick="window.open('${urls[0]}','_blank')">`;
      }
    }
    card.innerHTML = `
      <div class="evento-contenido">
        <div class="evento-texto">
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
        </div>
        ${imagenesHTML ? `<div class="evento-foto">${imagenesHTML}</div>` : ""}
      </div>
    `;
    main.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setLang('es');
  fetchEventos();
});