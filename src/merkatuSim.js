// ============= GESTIÓN DE DATOS =============
// Función para obtener el placeholder correcto según la sección
const getPlaceholderImage = (section) => {
  const imgFolder = currentTeam === 'f' ? 'f_2025-26' : '2025-26';
  if (section === 'porteros') {
    return `https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/${imgFolder}/def_port.jpg`;
  } else {
    return `https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/${imgFolder}/def_jug.jpg`;
  }
};

// Estructura para guardar datos separados por equipo
const getSimulationDataForTeam = (team) => {
  const stored = localStorage.getItem(`merkatuSim_${team}`);
  return stored ? JSON.parse(stored) : {
    porteros: [],
    defensas: [],
    centrocampistas: [],
    delanteros: [],
    salidas: []
  };
};

const saveSimulationDataForTeam = (team, data) => {
  localStorage.setItem(`merkatuSim_${team}`, JSON.stringify(data));
};

let simulationData = getSimulationDataForTeam(localStorage.getItem('team') || 'real');
let plantillaCompleta = [];
let plantillaFCompleta = [];
let currentTeam = localStorage.getItem('team') || 'real'; // 'real', 'sanse' o 'f'
let currentDorsalSection = null;
let currentDorsalIdx = null;

// IndexedDB para imágenes personalizadas
let imageDB;
const initDB = () => {
  const request = indexedDB.open('merkatuSimImages', 1);
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images', { keyPath: 'id' });
    }
  };
  request.onsuccess = (e) => {
    imageDB = e.target.result;
  };
};

const saveImageToDB = (imageId, imageData) => {
  if (!imageDB) return Promise.reject('DB not ready');
  return new Promise((resolve, reject) => {
    const tx = imageDB.transaction(['images'], 'readwrite');
    const store = tx.objectStore('images');
    store.put({ id: imageId, data: imageData });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getImageFromDB = (imageId) => {
  if (!imageDB) return Promise.reject('DB not ready');
  return new Promise((resolve, reject) => {
    const tx = imageDB.transaction(['images'], 'readonly');
    const store = tx.objectStore('images');
    const request = store.get(imageId);
    request.onsuccess = () => resolve(request.result && request.result.data);
    request.onerror = () => reject(tx.error);
  });
};

// ============= CARGA INICIAL =============
let playersCache = {}; // Cachear jugadores para cada equipo

async function loadPlantilla() {
  // Cargar plantilla Real Sociedad
  const data = await fetch('https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/json/plantilla_2025-26.json').then(r => r.json());
  plantillaCompleta = data;
  
  // Cargar plantilla F
  try {
    const dataF = await fetch('https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/json/plantilla_f_2025-26.json').then(r => r.json());
    plantillaFCompleta = dataF;
  } catch (err) {
    console.error('Error cargando plantilla_f_2025-26.json:', err);
  }
  
  // Pre-cachear jugadores para cada équipo
  cachePlayersForAllTeams();
  
  // Reinicializar datos según el equipo seleccionado
  reinitializeByTeam();
  
  // No renderizar aquí - esperar a que i18next esté completamente listo
}

function cachePlayersForAllTeams() {
  const excludeUrlNames = ['jon_ansotegi', 'imanol_agirretxe', 'sergio_francisco', 'iosu_rivas', 'imanol_alguacil', 'mikel_labaka'];
  
  // Cachear para Real Sociedad
  playersCache['real'] = {
    porteros: [],
    defensas: [],
    centrocampistas: [],
    delanteros: [],
    salidas: []
  };
  plantillaCompleta.filter(p => p.tipo === 'jugador' && !excludeUrlNames.includes(p.url_name)).forEach(player => {
    const posMap = { 'POR': 'porteros', 'DEF': 'defensas', 'MED': 'centrocampistas', 'DEL': 'delanteros' };
    if (posMap[player.pos]) {
      playersCache['real'][posMap[player.pos]].push({ ...player, tempId: Date.now() + Math.random() });
    }
  });
  
  // Cachear para Sanse
  playersCache['sanse'] = {
    porteros: [],
    defensas: [],
    centrocampistas: [],
    delanteros: [],
    salidas: []
  };
  plantillaCompleta.filter(p => (p.tipo === 'sanse' || p.tipo === 'dual') && !excludeUrlNames.includes(p.url_name)).forEach(player => {
    const posMap = { 'POR': 'porteros', 'DEF': 'defensas', 'MED': 'centrocampistas', 'DEL': 'delanteros' };
    if (posMap[player.pos]) {
      playersCache['sanse'][posMap[player.pos]].push({ ...player, tempId: Date.now() + Math.random() });
    }
  });
  
  // Cachear para F
  playersCache['f'] = {
    porteros: [],
    defensas: [],
    centrocampistas: [],
    delanteros: [],
    salidas: []
  };
  plantillaFCompleta.filter(p => p.tipo === 'jugador' && !excludeUrlNames.includes(p.url_name)).forEach(player => {
    const posMap = { 'POR': 'porteros', 'DEF': 'defensas', 'MED': 'centrocampistas', 'DEL': 'delanteros' };
    if (posMap[player.pos]) {
      playersCache['f'][posMap[player.pos]].push({ ...player, tempId: Date.now() + Math.random() });
    }
  });
}

function reinitializeByTeam() {
  // Recuperar datos guardados del equipo actual
  const savedData = getSimulationDataForTeam(currentTeam);
  
  // Si hay datos guardados, usarlos
  if (savedData.porteros.length > 0 || savedData.defensas.length > 0 || 
      savedData.centrocampistas.length > 0 || savedData.delanteros.length > 0 || 
      savedData.salidas.length > 0) {
    simulationData = savedData;
  } else if (playersCache[currentTeam]) {
    // Si no hay datos guardados pero el cache existe, usar el cache
    simulationData = JSON.parse(JSON.stringify(playersCache[currentTeam])); // Copia profunda
    saveSimulationDataForTeam(currentTeam, simulationData);
  } else {
    // Fallback: inicializar vacío si no hay cache
    simulationData = {
      porteros: [],
      defensas: [],
      centrocampistas: [],
      delanteros: [],
      salidas: []
    };
  }
}

// ============= RENDERIZADO =============
function renderAllSections() {
  renderSection('porteros', 'POR');
  renderSection('defensas', 'DEF');
  renderSection('centrocampistas', 'MED');
  renderSection('delanteros', 'DEL');
  renderSection('salidas', 'SALIDA');
}

function sortPlayersByDorsal(section) {
  if (!simulationData[section]) return;
  const dorsalField = currentTeam === 'sanse' ? 'dorsal2' : 'dorsal';
  simulationData[section].sort((a, b) => {
    const aNum = parseInt(a[dorsalField]) || 99;
    const bNum = parseInt(b[dorsalField]) || 99;
    return aNum - bNum;
  });
}

function renderSection(sectionKey, posFilter) {
  sortPlayersByDorsal(sectionKey);
  const container = document.getElementById(sectionKey + 'Container');
  container.innerHTML = '';
  const players = simulationData[sectionKey] || [];
  
  // Usar DocumentFragment para batching de DOM updates
  const fragment = document.createDocumentFragment();
  
  players.forEach((player, idx) => {
    const card = createPlayerCard(player, sectionKey, idx);
    fragment.appendChild(card);
  });
  
  // Botón de agregar jugador
  const addCard = document.createElement('div');
  addCard.className = 'player-card add-btn';
  addCard.innerHTML = '<div class="add-btn-icon">+</div>';
  addCard.onclick = () => openAddPlayerModal(sectionKey);
  fragment.appendChild(addCard);
  
  // Agregar todo de una vez
  container.appendChild(fragment);
}

function createPlayerCard(player, sectionKey, idx) {
  const card = document.createElement('div');
  card.className = 'player-card';
  
  // Determinar qué imagen usar según el equipo
  let imgFolder = '2025-26';
  if (currentTeam === 'f') {
    imgFolder = 'f_2025-26';
  }
  let imgSrc = `https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/${imgFolder}/${player.url_name}.jpg`;
  
  // Si tiene imagen por defecto, usarla
  if (player.defaultImage) {
    imgSrc = `https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/${player.defaultImage}`;
  }
  
  // Si tiene imagen personalizada, cargarla desde IndexedDB
  if (player.customImageId) {
    getImageFromDB(player.customImageId).then(imageData => {
      if (imageData) {
        const img = card.querySelector('.player-img');
        if (img) img.src = imageData;
      }
    });
  }
  
  // Usar dorsal2 para Sanse, dorsal para otros
  const dorsalDisplay = currentTeam === 'sanse' && player.dorsal2 ? player.dorsal2 : player.dorsal;
  
  // Función para estilos de banderas
  const getFlagStyle = (pais) => {
    const noDeform = ['NafarroaG', 'Gipuzkoa', 'Bizkaia', 'Araba', 'Lapurdi', 'NafarroaB', 'Zuberoa'];
    const baseStyle = 'vertical-align:middle; width:24px; height:16px;';
    const withBox = baseStyle + ' border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,0.10);';
    return noDeform.includes(pais) ? baseStyle + ' object-fit:contain;' : withBox;
  };
  
  // Función para formatear fecha de nacimiento con edad
  const formatBirthdateWithAge = (jaioData) => {
    if (!jaioData) return '';
    
    // Convertir formato YYYY/MM/DD a YYYY-MM-DD si es necesario
    const fechaFormato = jaioData.replace(/\//g, '-');
    const [year, month, day] = fechaFormato.split('-').map(Number);
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Ajustar la edad si el cumpleaños aún no ha ocurrido este año
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    
    return `${fechaFormato} (${age} ${t('plantilla.anos')})`;
  };
  
  // Construir HTML de banderas si no es personalizado (igual que en plantilla)
  let flagsHtml = '';
  if (!player.customImageId) {
    const buildFlagImg = (pais, flagIdx) => {
      if (!pais) return '';
      if (pais.startsWith('customFlag:')) {
        const customFlagId = pais.substring('customFlag:'.length);
        const altTag = `custom-flag-${sectionKey}-${idx}-${flagIdx}`;
        getImageFromDB(customFlagId).then(imageData => {
          if (imageData) {
            const flagImg = card.querySelector(`img[alt="${altTag}"]`);
            if (flagImg) flagImg.src = imageData;
          }
        });
        return `<img alt="${altTag}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" style="${getFlagStyle('custom')} margin-right:4px;">`;
      } else {
        return `<img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${pais}.png" alt="flag-${flagIdx}" style="${getFlagStyle(pais)} margin-right:4px;">`;
      }
    };
    
    // Iterar sobre array de países
    flagsHtml = player.pais.map((pais, idx) => buildFlagImg(pais, idx)).join('');
  }
  
  card.innerHTML = `
    <img class="player-img" src="${imgSrc}" 
         alt="${player.name}" onerror="this.src='${getPlaceholderImage(sectionKey)}'">
    <div class="player-info">
      <span class="player-name">
        ${flagsHtml}
        ${player.name}${player.kapitaina === 1 ? ` <img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/kapitaina.png" alt="C" style="width:18px; height:18px; margin-left:4px; vertical-align:middle;">` : ''}
      </span>
      <span class="player-fullname">${player.fullname || ''}</span>
        ${player.jaioData ? `<span class="player-birthdate">${formatBirthdateWithAge(player.jaioData)}</span>` : ''}
        <span class="player-dorsal">${t('merkatuSim.dorsal')}: ${dorsalDisplay}</span>
    </div>
    <button class="menu-btn" onclick="toggleContextMenu(event, '${sectionKey}', ${idx})">⋮</button>
    <div class="context-menu" id="menu-${sectionKey}-${idx}" style="display:none;">
      <button class="context-menu-item" onmouseenter="showSubmenu('${sectionKey}', ${idx})">
        ${t('merkatuSim.mover')}
      </button>
      <div class="submenu" id="submenu-${sectionKey}-${idx}" style="display:none;" onmouseleave="hideSubmenu('${sectionKey}', ${idx})">
        <button class="submenu-item" onclick="movePlayer('${sectionKey}', ${idx}, 'porteros')">${t('merkatuSim.portero')}</button>
        <button class="submenu-item" onclick="movePlayer('${sectionKey}', ${idx}, 'defensas')">${t('merkatuSim.defensa')}</button>
        <button class="submenu-item" onclick="movePlayer('${sectionKey}', ${idx}, 'centrocampistas')">${t('merkatuSim.centrocampista')}</button>
        <button class="submenu-item" onclick="movePlayer('${sectionKey}', ${idx}, 'delanteros')">${t('merkatuSim.delantero')}</button>
        <button class="submenu-item" onclick="movePlayer('${sectionKey}', ${idx}, 'salidas')">${t('merkatuSim.salida')}</button>
      </div>
      <button class="context-menu-item" onclick="deletePlayer('${sectionKey}', ${idx})">
        ${t('merkatuSim.eliminar')}
      </button>
      <button class="context-menu-item" onclick="openEditModal('${sectionKey}', ${idx})">
        ${t('merkatuSim.editar')}
      </button>
      <button class="context-menu-item" onclick="toggleCaptaincy('${sectionKey}', ${idx})">
        ${player.kapitaina === 1 ? t('merkatuSim.quitarKapitaintza') : t('merkatuSim.darKapitaintza')}
      </button>
    </div>
  `;
  return card;
}

// ============= MENÚ CONTEXTUAL =============
function toggleContextMenu(event, sectionKey, idx) {
  event.stopPropagation();
  const menu = document.getElementById(`menu-${sectionKey}-${idx}`);
  const isVisible = menu.style.display !== 'none';
  document.querySelectorAll('.context-menu').forEach(m => m.style.display = 'none');
  document.querySelectorAll('.submenu').forEach(m => m.style.display = 'none');
  menu.style.display = isVisible ? 'none' : 'block';
  menu.style.top = event.target.offsetTop + 'px';
  menu.style.right = '0';
}

function showSubmenu(sectionKey, idx) {
  const submenu = document.getElementById(`submenu-${sectionKey}-${idx}`);
  submenu.style.display = 'block';
  
  // Detectar si hay espacio a la derecha
  setTimeout(() => {
    const rect = submenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      // Si se sale de la pantalla, cambiar a la izquierda
      submenu.style.left = 'auto';
      submenu.style.right = '100%';
      submenu.style.marginRight = '8px';
      submenu.style.marginLeft = '0';
    } else {
      // Si hay espacio, mantener a la derecha
      submenu.style.left = '100%';
      submenu.style.right = 'auto';
      submenu.style.marginLeft = '8px';
      submenu.style.marginRight = '0';
    }
  }, 0);
}

function hideSubmenu(sectionKey, idx) {
  setTimeout(() => {
    const submenu = document.getElementById(`submenu-${sectionKey}-${idx}`);
    if (submenu) {
      submenu.style.display = 'none';
    }
  }, 100);
}

function movePlayer(fromSection, idx, toSection) {
  const player = simulationData[fromSection][idx];
  simulationData[toSection].push(player);
  simulationData[fromSection].splice(idx, 1);
  saveAndRender();
}

function deletePlayer(sectionKey, idx) {
  simulationData[sectionKey].splice(idx, 1);
  saveAndRender();
}

function toggleCaptaincy(sectionKey, idx) {
  const player = simulationData[sectionKey][idx];
  
  if (player.kapitaina === 1) {
    // Si es capitán, quitar la capitanía
    player.kapitaina = 0;
  } else {
    // Si no es capitán, buscar y quitar la capitanía al anterior capitán
    // Buscar en TODAS las secciones
    for (const section in simulationData) {
      for (const p of simulationData[section]) {
        if (p.kapitaina === 1) {
          p.kapitaina = 0;
        }
      }
    }
    // Darle la capitanía al jugador actual
    player.kapitaina = 1;
  }
  
  saveAndRender();
}

function openDorsalModal(sectionKey, idx) {
  currentDorsalSection = sectionKey;
  currentDorsalIdx = idx;
  const dorsalField = currentTeam === 'sanse' ? 'dorsal2' : 'dorsal';
  document.getElementById('dorsalInput').value = simulationData[sectionKey][idx][dorsalField] || '';
  document.getElementById('dorsalModal').classList.add('active');
  document.getElementById('dorsalInput').focus();
}

function closeDorsalModal() {
  document.getElementById('dorsalModal').classList.remove('active');
  currentDorsalSection = null;
  currentDorsalIdx = null;
}

function saveDorsal() {
  const newDorsal = document.getElementById('dorsalInput').value;
  const dorsalField = currentTeam === 'sanse' ? 'dorsal2' : 'dorsal';
  if (newDorsal && !isNaN(newDorsal)) {
    simulationData[currentDorsalSection][currentDorsalIdx][dorsalField] = parseInt(newDorsal);
  } else {
    simulationData[currentDorsalSection][currentDorsalIdx][dorsalField] = 99;
  }
  saveAndRender();
  closeDorsalModal();
}

// ============= AÑADIR JUGADOR =============
let addPlayerSection = null;
let editPlayerSection = null;
let editPlayerIdx = null;

function openAddPlayerModal(sectionKey) {
  addPlayerSection = sectionKey;
  document.getElementById('addPlayerModal').classList.add('active');
  createModalTabs();
}

function closeAddPlayerModal() {
  document.getElementById('addPlayerModal').classList.remove('active');
  addPlayerSection = null;
  document.getElementById('modalTabsContainer').innerHTML = '';
}

function openEditModal(sectionKey, idx) {
  editPlayerSection = sectionKey;
  editPlayerIdx = idx;
  const player = simulationData[sectionKey][idx];
  
  // Cargar la pestaña de personalizado pero con datos de edición
  document.getElementById('addPlayerModal').classList.add('active');
  createEditModalTabs(player, sectionKey, idx);
}

function closeEditModal() {
  document.getElementById('addPlayerModal').classList.remove('active');
  editPlayerSection = null;
  editPlayerIdx = null;
  document.getElementById('modalTabsContainer').innerHTML = '';
}

function createEditModalTabs(player, sectionKey, idx) {
  const container = document.getElementById('modalTabsContainer');
  container.innerHTML = `
    <div id="tab-editar" class="modal-section"></div>
  `;
  loadEditTab(player, sectionKey, idx);
}

function loadEditTab(player, sectionKey, idx) {
  const container = document.getElementById('tab-editar');
  container.innerHTML = `
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.nombre')}</label>
      <input type="text" class="modal-input" id="edit-nombre" placeholder="Jose Luis Korta" value="${player.fullname || ''}">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.nombreDeportivo')}</label>
      <input type="text" class="modal-input" id="edit-deportivo" placeholder="Korta" value="${player.name || ''}">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.dorsal')}</label>
      <input type="number" class="modal-input" id="edit-dorsal" placeholder="16" value="${player.dorsal || ''}">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.jaiodata')}</label>
      <input type="text" class="modal-input" id="edit-jaiodata" placeholder="YYYY-MM-DD" maxlength="10" value="${player.jaioData || ''}">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.nacionalidad')}</label>
      <div style="margin-bottom: 10px; font-size: 0.9em; color: #666;">${t('merkatuSim.seleccionar')} hasta 4 banderas</div>
      <div id="flags-dropdown-edit" style="display: flex; flex-wrap: wrap; gap: 8px; border: 1px solid #ddd; border-radius: 4px; padding: 8px; max-height: 200px; overflow-y: auto;">
        <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 16px; border: 2px dashed #999; border-radius: 2px; font-size: 12px; font-weight: bold; color: #999;">
          <input type="file" id="edit-flag-image" accept="image/*" style="display: none;">
          +
        </label>
      </div>
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <input type="hidden" id="edit-pais-array" value="${JSON.stringify(Array.isArray(player.pais) ? player.pais : [])}">
      </div>
    </div>
    <button class="modal-btn modal-btn-primary" style="width: 100%;" onclick="saveEditedPlayer('${sectionKey}', ${idx})">
      ${t('merkatuSim.guardar')}
    </button>
  `;
  
  // Configurar el input de fecha
  const dateInput = document.getElementById('edit-jaiodata');
  dateInput.addEventListener('input', handleDateInput);
  dateInput.addEventListener('keypress', handleDateKeypress);
  
  // Cargar las banderas disponibles
  loadFlagsDropdownEdit();
  
  // Permitir seleccionar imagen de bandera personalizada
  document.getElementById('edit-flag-image').addEventListener('change', (e) => handleCustomFlagUploadEdit(e, 'flags-dropdown-edit'));
}

function createModalTabs() {
  const container = document.getElementById('modalTabsContainer');
  container.innerHTML = `
    <button class="modal-btn modal-btn-tab active" data-tab="tab-dereal" onclick="switchTab(this)">
      ${t('merkatuSim.deReal')}
    </button>
    <button class="modal-btn modal-btn-tab" data-tab="tab-personalizado" onclick="switchTab(this)">
      ${t('merkatuSim.personalizado')}
    </button>
    <div id="tab-dereal" class="modal-section"></div>
    <div id="tab-personalizado" class="modal-section"></div>
  `;
  loadTabContent('tab-dereal');
}

function switchTab(btn) {
  const tabId = btn.getAttribute('data-tab');
  document.querySelectorAll('.modal-btn-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-dereal').innerHTML = '';
  document.getElementById('tab-personalizado').innerHTML = '';
  loadTabContent(tabId);
}

function loadTabContent(tabId) {
  if (tabId === 'tab-dereal') {
    loadRealPlayers();
  } else if (tabId === 'tab-personalizado') {
    loadPersonalizedTab();
  }
}

function showTabContent(event, tabId) {
  if (event) event.target.classList.add('active');
  document.querySelectorAll('.modal-btn-tab').forEach(btn => {
    if (btn !== (event && event.target)) btn.classList.remove('active');
  });
  
  // Limpiar contenido anterior
  document.getElementById('tab-dereal').innerHTML = '';
  document.getElementById('tab-personalizado').innerHTML = '';
  
  if (tabId === 'tab-dereal') {
    loadRealPlayers();
  } else if (tabId === 'tab-personalizado') {
    loadPersonalizedTab();
  }
}

function loadRealPlayers() {
  const container = document.getElementById('tab-dereal');
  const excludeUrlNames = ['jon_ansotegi', 'imanol_agirretxe', 'sergio_francisco', 'iosu_rivas', 'imanol_alguacil', 'mikel_labaka'];
  const currentPlayerNames = new Set(Object.values(simulationData).flat().map(p => p.url_name));
  
  let availablePlayers = [];
  let selectablePlayers = new Set();
  
  if (currentTeam === 'sanse') {
    // Sanse: 'sanse', 'dual', 'sanse-dual', 'dual-ber-bi' y 'salida-sanse' (excluir 'jugador' completamente)
    availablePlayers = plantillaCompleta.filter(p =>
      (p.tipo === 'sanse' || p.tipo === 'dual' || p.tipo === 'sanse-dual' || p.tipo === 'dual-ber-bi' || p.tipo === 'salida-sanse') &&
      !excludeUrlNames.includes(p.url_name) &&
      !currentPlayerNames.has(p.url_name)
    );
    plantillaCompleta.forEach(p => {
      if ((p.tipo === 'sanse' || p.tipo === 'dual' || p.tipo === 'sanse-dual' || p.tipo === 'dual-ber-bi' || p.tipo === 'salida-sanse') && !excludeUrlNames.includes(p.url_name)) {
        selectablePlayers.add(p.url_name);
      }
    });
  } else if (currentTeam === 'f') {
    // F: disponibles son todos del JSON de F excepto jose_luis_sanchez_vera
    const excludeF = ['jose_luis_sanchez_vera'];
    availablePlayers = plantillaFCompleta.filter(p =>
      !excludeUrlNames.includes(p.url_name) &&
      !currentPlayerNames.has(p.url_name) &&
      p.tipo !== 'entrenador' &&
      !excludeF.includes(p.url_name)
    );
    plantillaFCompleta.forEach(p => {
      if ((p.tipo === 'jugador' || p.tipo === 'dual' || p.tipo === 'salida' || p.tipo === 'dual-ber-bi') && 
          !excludeUrlNames.includes(p.url_name) &&
          !excludeF.includes(p.url_name)) {
        selectablePlayers.add(p.url_name);
      }
    });
  } else {
    // Real Sociedad: disponibles son 'jugador', 'salida', 'dual' y 'dual-ber-bi'
    availablePlayers = plantillaCompleta.filter(p =>
      (p.tipo === 'jugador' || p.tipo === 'salida' || p.tipo === 'sanse' || p.tipo === 'dual' || p.tipo === 'dual-ber-bi') &&
      !excludeUrlNames.includes(p.url_name) &&
      !currentPlayerNames.has(p.url_name)
    );
    plantillaCompleta.forEach(p => {
      if ((p.tipo === 'jugador' || p.tipo === 'salida' || p.tipo === 'sanse' || p.tipo === 'dual' || p.tipo === 'dual-ber-bi') && !excludeUrlNames.includes(p.url_name)) {
        selectablePlayers.add(p.url_name);
      }
    });
  }

  if (availablePlayers.length === 0) {
    container.innerHTML = `<p style="color:#666;">${t('merkatuSim.nuevo')}</p>`;
    return;
  }

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'modal-input';
  searchInput.placeholder = t('merkatuSim.buscar');
  container.appendChild(searchInput);

  const resultsList = document.createElement('div');
  resultsList.className = 'modal-search-results';
  container.appendChild(resultsList);

  function updateResults() {
    const query = searchInput.value.toLowerCase();
    resultsList.innerHTML = '';
    const filtered = availablePlayers.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.fullname.toLowerCase().includes(query)
    );
    filtered.forEach(player => {
      const item = document.createElement('div');
      const isSelectable = selectablePlayers.has(player.url_name);
      item.className = 'modal-search-item' + (isSelectable ? '' : ' disabled');
      item.style.opacity = isSelectable ? '1' : '0.5';
      item.style.cursor = isSelectable ? 'pointer' : 'not-allowed';
      item.innerHTML = `<strong>${player.name}</strong><br><small>${player.fullname}</small>`;
      if (isSelectable) {
        item.onclick = () => addPlayerToSimulation(player);
      }
      resultsList.appendChild(item);
    });
  }

  searchInput.addEventListener('input', updateResults);
  updateResults();
}

function getFlagStyle(pais) {
  const noDeform = ['NafarroaG', 'Gipuzkoa', 'Bizkaia', 'Araba', 'Lapurdi', 'NafarroaB', 'Zuberoa'];
  const baseStyle = 'width:24px; height:16px; object-fit:cover; border-radius:2px; cursor:pointer;';
  const withBox = baseStyle + ' box-shadow:0 1px 2px rgba(0,0,0,0.10);';
  return noDeform.includes(pais) ? baseStyle + ' object-fit:contain;' : withBox;
}

async function getAvailableFlags() {
  try {
    // Intentar obtener el listado de banderas desde un archivo JSON
    const response = await fetch('https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/json/banderas.json');
    if (response.ok) {
      const data = await response.json();
      return data.banderas || [];
    }
  } catch (err) {
    console.log('No se pudo cargar banderas.json, intentando con GitHub API...');
  }
  
  // Si el JSON no existe, usar la GitHub API para listar archivos
  try {
    const response = await fetch('https://api.github.com/repos/OriyokoIjitua/TwReal/contents/img/banderak');
    if (response.ok) {
      const data = await response.json();
      return data
        .filter(file => file.name.endsWith('.png'))
        .map(file => file.name.replace('.png', ''))
        .sort();
    }
  } catch (err) {
    console.warn('No se pudo obtener listado de banderas desde GitHub API');
  }
  
  // Fallback a lista real actualizada
  return [
    'Alemania', 'Araba', 'Armenia', 'Australia', 'Austria', 'Bizkaia', 'Brazil', 'Brittany', 
    'Cameroon', 'Catalunya', 'Chequia', 'Colombia', 'Croacia', 'Escocia', 'España', 
    'Euskal Herria', 'Finlandia', 'Francia', 'Galicia', 'Ghana', 'Gipuzkoa', 'Guinea-Bissau', 
    'Hungaria', 'Inglaterra', 'IslMan', 'Islandia', 'Italia', 'Ivory Coast', 'Japón', 'Kenya', 
    'Lapurdi', 'Mali', 'Marruecos', 'NafarroaB', 'NafarroaG', 'Netherlands', 'Nigeria', 'Norway', 
    'Portugal', 'Rusia', 'Surinam', 'Turkey', 'USA', 'Venezuela', 'Zuberoa'
  ];
}

async function loadFlagsDropdown() {
  const dropdown = document.getElementById('flags-dropdown');
  
  // Obtener lista de banderas disponibles dinámicamente
  const flagsList = await getAvailableFlags();
  
  flagsList.forEach(flagName => {
    const label = document.createElement('label');
    label.style.cssText = 'cursor: pointer; display: flex; align-items: center;';
    label.className = 'flag-option';
    label.setAttribute('data-flag', flagName);
    label.innerHTML = `
      <img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${flagName}.png" 
           alt="${flagName}" 
           style="${getFlagStyle(flagName)}"
           title="${flagName}"
           onclick="selectCustomFlag('${flagName}')">
      <input type="radio" name="pais" value="${flagName}" style="display:none;">
    `;
    dropdown.appendChild(label);
  });
  
  // Actualizar el display de las banderas
  updateFlagDisplay();
}

async function loadFlagsDropdownEdit() {
  const dropdown = document.getElementById('flags-dropdown-edit');
  
  // Obtener lista de banderas disponibles dinámicamente
  const flagsList = await getAvailableFlags();
  
  flagsList.forEach(flagName => {
    const label = document.createElement('label');
    label.style.cssText = 'cursor: pointer; display: flex; align-items: center;';
    label.className = 'flag-option';
    label.setAttribute('data-flag', flagName);
    label.innerHTML = `
      <img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${flagName}.png" 
           alt="${flagName}" 
           style="${getFlagStyle(flagName)}"
           title="${flagName}"
           onclick="selectEditCustomFlag('${flagName}')">
      <input type="radio" name="pais" value="${flagName}" style="display:none;">
    `;
    dropdown.appendChild(label);
  });
  
  // Actualizar el display de las banderas
  updateFlagDisplayEdit();
}

async function handleCustomFlagUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    const imageId = 'flag-' + Date.now() + Math.random();
    try {
      await saveImageToDB(imageId, event.target.result);
      
      // Crear una miniatura de la bandera personalizada
      const dropdown = document.getElementById('flags-dropdown');
      const label = document.createElement('label');
      label.style.cssText = 'cursor: pointer; display: flex; align-items: center;';
      label.className = 'flag-option custom-flag';
      
      const img = document.createElement('img');
      img.src = event.target.result;
      img.style.cssText = 'width:24px; height:16px; object-fit:cover; border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,0.10); cursor:pointer; opacity: 0.5;';
      img.classList.add('custom-flag-img');
      img.setAttribute('data-flag-id', imageId);
      img.onclick = () => selectCustomFlag(imageId, true);
      img.alt = 'custom-' + imageId;
      img.title = 'Bandera personalizada';
      
      label.appendChild(img);
      
      // Insertar después del botón de subida
      dropdown.insertBefore(label, dropdown.children[1]);
      
      // Seleccionar la bandera personalizada
      selectCustomFlag(imageId, true);
      
      // Limpiar el input para permitir subir otro archivo
      document.getElementById('custom-flag-image').value = '';
    } catch (err) {
      console.error('Error saving custom flag:', err);
      alert('Error al guardar la bandera personalizada');
    }
  };
  reader.readAsDataURL(file);
}

function selectEditCustomFlag(flagId, isCustom = false) {
  // Obtener el array actual de países
  const paisArrayInput = document.getElementById('edit-pais-array');
  let paisArray = [];
  try {
    paisArray = JSON.parse(paisArrayInput.value || '[]');
  } catch (e) {
    paisArray = [];
  }
  
  const newValue = isCustom ? 'customFlag:' + flagId : flagId;
  
  // Buscar si la bandera ya está seleccionada para deseleccionarla
  const index = paisArray.indexOf(newValue);
  if (index !== -1) {
    paisArray.splice(index, 1);
    paisArrayInput.value = JSON.stringify(paisArray);
    updateFlagDisplayEdit();
    return;
  }
  
  // Si no hemos llegado al límite de 4, agregar la bandera
  if (paisArray.length < 4) {
    paisArray.push(newValue);
    paisArrayInput.value = JSON.stringify(paisArray);
    updateFlagDisplayEdit();
  }
}

function updateFlagDisplayEdit() {
  // Actualizar la opacidad de las banderas según lo seleccionado
  const paisArrayInput = document.getElementById('edit-pais-array');
  let selected = [];
  try {
    selected = JSON.parse(paisArrayInput.value || '[]');
  } catch (e) {
    selected = [];
  }
  
  document.querySelectorAll('#flags-dropdown-edit .flag-option img').forEach(img => {
    let isSelected = false;
    
    if (img.classList && img.classList.contains('custom-flag-img')) {
      // Es una bandera personalizada
      const customId = img.getAttribute('data-flag-id');
      isSelected = selected.some(s => s === 'customFlag:' + customId);
    } else {
      // Es una bandera normal
      const flagName = img.alt;
      isSelected = selected.some(s => {
        if (s.startsWith('customFlag:')) {
          return false;
        }
        return s === flagName;
      });
    }
    
    img.style.opacity = isSelected ? '1' : '0.5';
    img.style.border = isSelected ? '2px solid #007bff' : 'none';
  });
}

async function handleCustomFlagUploadEdit(e, dropdownId) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    const imageId = 'flag-' + Date.now() + Math.random();
    try {
      await saveImageToDB(imageId, event.target.result);
      
      // Crear una miniatura de la bandera personalizada
      const dropdown = document.getElementById(dropdownId);
      const label = document.createElement('label');
      label.style.cssText = 'cursor: pointer; display: flex; align-items: center;';
      label.className = 'flag-option custom-flag';
      
      const img = document.createElement('img');
      img.src = event.target.result;
      img.style.cssText = 'width:24px; height:16px; object-fit:cover; border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,0.10); cursor:pointer; opacity: 0.5;';
      img.classList.add('custom-flag-img');
      img.setAttribute('data-flag-id', imageId);
      img.onclick = () => selectEditCustomFlag(imageId, true);
      img.alt = 'custom-' + imageId;
      img.title = 'Bandera personalizada';
      
      label.appendChild(img);
      
      // Insertar después del botón de subida
      dropdown.insertBefore(label, dropdown.children[1]);
      
      // Seleccionar la bandera personalizada
      selectEditCustomFlag(imageId, true);
      
      // Limpiar el input para permitir subir otro archivo
      document.getElementById('edit-flag-image').value = '';
    } catch (err) {
      console.error('Error saving custom flag:', err);
      alert('Error al guardar la bandera personalizada');
    }
  };
  reader.readAsDataURL(file);
}

function selectCustomFlag(flagId, isCustom = false) {
  // Obtener el array actual de países
  const paisArrayInput = document.getElementById('custom-pais-array');
  let paisArray = [];
  try {
    paisArray = JSON.parse(paisArrayInput.value || '[]');
  } catch (e) {
    paisArray = [];
  }
  
  const newValue = isCustom ? 'customFlag:' + flagId : flagId;
  
  // Buscar si la bandera ya está seleccionada para deseleccionarla
  const index = paisArray.indexOf(newValue);
  if (index !== -1) {
    paisArray.splice(index, 1);
    paisArrayInput.value = JSON.stringify(paisArray);
    updateFlagDisplay();
    return;
  }
  
  // Si no hemos llegado al límite de 4, agregar la bandera
  if (paisArray.length < 4) {
    paisArray.push(newValue);
    paisArrayInput.value = JSON.stringify(paisArray);
    updateFlagDisplay();
  }
}

function updateFlagDisplay() {
  // Actualizar la opacidad de las banderas según lo seleccionado
  const paisArrayInput = document.getElementById('custom-pais-array');
  let selected = [];
  try {
    selected = JSON.parse(paisArrayInput.value || '[]');
  } catch (e) {
    selected = [];
  }
  
  document.querySelectorAll('#flags-dropdown .flag-option img').forEach(img => {
    let isSelected = false;
    
    if (img.classList && img.classList.contains('custom-flag-img')) {
      // Es una bandera personalizada
      const customId = img.getAttribute('data-flag-id');
      isSelected = selected.some(s => s === 'customFlag:' + customId);
    } else {
      // Es una bandera normal
      const flagName = img.alt;
      isSelected = selected.some(s => {
        if (s.startsWith('customFlag:')) {
          return false;
        }
        return s === flagName;
      });
    }
    
    img.style.opacity = isSelected ? '1' : '0.5';
    img.style.border = isSelected ? '2px solid #007bff' : 'none';
  });
}

function handleDateKeypress(e) {
  const input = e.target;
  const value = input.value;
  const cursorPos = input.selectionStart;
  
  // Si presiona "-", rellenar con ceros el segmento actual
  if (e.key === '-') {
    e.preventDefault();
    
    // Filtrar solo números del valor actual
    const numbersOnly = value.replace(/\D/g, '');
    
    if (numbersOnly.length < 4) {
      // Segmento de año incompleto, rellenar con ceros al principio
      const fillCount = 4 - numbersOnly.length;
      input.value = '0'.repeat(fillCount) + numbersOnly + '-';
    } else if (numbersOnly.length === 4) {
      // Año completado, crear guión
      input.value = numbersOnly + '-';
    } else if (numbersOnly.length < 6) {
      // Segmento de mes incompleto, rellenar con ceros
      const yearPart = numbersOnly.substring(0, 4);
      const monthPart = numbersOnly.substring(4);
      const fillCount = 2 - monthPart.length;
      input.value = yearPart + '-' + '0'.repeat(fillCount) + monthPart + '-';
    } else if (numbersOnly.length === 6) {
      // Mes completado, crear segundo guión
      input.value = numbersOnly.substring(0, 4) + '-' + numbersOnly.substring(4) + '-';
    }
  }
}

function handleDateInput(e) {
  const input = e.target;
  let value = input.value;
  
  // Filtrar solo números
  const numbersOnly = value.replace(/\D/g, '');
  
  // Si ya hay 8 números (YYYYMMDD), no permitir más
  if (numbersOnly.length > 8) {
    input.value = value.substring(0, 10); // YYYY-MM-DD = 10 caracteres
    return;
  }
  
  // Construir el valor formateado
  let formattedValue = '';
  if (numbersOnly.length > 0) {
    formattedValue = numbersOnly.substring(0, 4);
  }
  if (numbersOnly.length > 4) {
    formattedValue += '-' + numbersOnly.substring(4, 6);
  }
  if (numbersOnly.length > 6) {
    formattedValue += '-' + numbersOnly.substring(6, 8);
  }
  
  input.value = formattedValue;
}

function loadPersonalizedTab() {
  const container = document.getElementById('tab-personalizado');
  container.innerHTML = `
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.nombre')}</label>
      <input type="text" class="modal-input" id="custom-nombre" placeholder="Jose Luis Korta">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.nombreDeportivo')}</label>
      <input type="text" class="modal-input" id="custom-deportivo" placeholder="Korta">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.dorsal')}</label>
      <input type="number" class="modal-input" id="custom-dorsal" placeholder="16">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.jaiodata')}</label>
      <input type="text" class="modal-input" id="custom-jaiodata" placeholder="YYYY-MM-DD" maxlength="10">
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.nacionalidad')}</label>
      <div id="flags-dropdown" style="display: flex; flex-wrap: wrap; gap: 8px; border: 1px solid #ddd; border-radius: 4px; padding: 8px; max-height: 200px; overflow-y: auto;">
        <label style="cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 16px; border: 2px dashed #999; border-radius: 2px; font-size: 12px; font-weight: bold; color: #999;">
          <input type="file" id="custom-flag-image" accept="image/*" style="display: none;">
          +
        </label>
      </div>
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <input type="hidden" id="custom-pais-array" value="[]">
      </div>
    </div>
    <div class="modal-section">
      <label class="modal-label">${t('merkatuSim.foto')}</label>
      <input type="file" class="modal-input" id="custom-foto" accept="image/*">
    </div>
    <button class="modal-btn modal-btn-primary" style="width: 100%;" onclick="addCustomPlayer()">
      ${t('merkatuSim.seleccionar')}
    </button>
  `;
  
  // Configurar el input de fecha
  const dateInput = document.getElementById('custom-jaiodata');
  dateInput.addEventListener('input', handleDateInput);
  dateInput.addEventListener('keypress', handleDateKeypress);
  
  // Cargar las banderas disponibles
  loadFlagsDropdown();
  
  // Permitir seleccionar imagen de bandera personalizada
  document.getElementById('custom-flag-image').addEventListener('change', handleCustomFlagUpload);
}

function addCustomPlayer() {
  const nombre = document.getElementById('custom-nombre').value || "Jose Luis Korta";
  const deportivo = document.getElementById('custom-deportivo').value;
  const dorsal = document.getElementById('custom-dorsal').value || '99';
  const jaioData = document.getElementById('custom-jaiodata').value;
  
  // Obtener el array de países
  const paisArrayInput = document.getElementById('custom-pais-array');
  let paisArray = [];
  try {
    paisArray = JSON.parse(paisArrayInput.value || '[]');
  } catch (e) {
    paisArray = [];
  }
  
  const fotoFile = document.getElementById('custom-foto').files[0];

  if (fotoFile) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageId = 'img-' + Date.now() + Math.random();
      try {
        await saveImageToDB(imageId, e.target.result);
        const newPlayer = {
          tipo: 'jugador',
          name: deportivo || nombre,
          fullname: nombre,
          url_name: nombre.replace(/\s+/g, '_').toLowerCase(),
          dorsal: parseInt(dorsal),
          jaioData: jaioData,
          pais: paisArray.length > 0 ? paisArray : ["Euskal Herria", "Gipuzkoa"],
          customImageId: imageId,
          tempId: Date.now() + Math.random()
        };
        addPlayerToSimulation(newPlayer);
      } catch (err) {
        console.error('Error saving image:', err);
        alert('Error al guardar la imagen');
      }
    };
    reader.readAsDataURL(fotoFile);
  } else {
    const defaultImage = addPlayerSection === 'porteros' 
      ? 'img/2025-26/def_port.jpg'
      : 'img/2025-26/def_jug.jpg';
    
    const newPlayer = {
      tipo: 'jugador',
      name: deportivo || nombre,
      fullname: nombre,
      url_name: nombre.replace(/\s+/g, '_').toLowerCase(),
      dorsal: parseInt(dorsal),
      jaioData: jaioData,
      pais: paisArray.length > 0 ? paisArray : ["Euskal Herria", "Gipuzkoa"],
      defaultImage: defaultImage,
      tempId: Date.now() + Math.random()
    };
    addPlayerToSimulation(newPlayer);
  }
}

function saveEditedPlayer(sectionKey, idx) {
  const nombre = document.getElementById('edit-nombre').value || "Jose Luis Korta";
  const deportivo = document.getElementById('edit-deportivo').value;
  const dorsal = document.getElementById('edit-dorsal').value || '99';
  const jaioData = document.getElementById('edit-jaiodata').value;
  
  // Obtener el array de países
  const paisArrayInput = document.getElementById('edit-pais-array');
  let paisArray = [];
  try {
    paisArray = JSON.parse(paisArrayInput.value || '[]');
  } catch (e) {
    paisArray = [];
  }

  // Actualizar el jugador con los nuevos datos
  const player = simulationData[sectionKey][idx];
  player.name = deportivo || nombre;
  player.fullname = nombre;
  player.dorsal = parseInt(dorsal);
  player.jaioData = jaioData;
  player.pais = paisArray.length > 0 ? paisArray : player.pais; // Mantener el array de países

  saveAndRender();
  closeEditModal();
}

function addPlayerToSimulation(player) {
  if (player.kapitaina === 1) {
    const hasCaptain = Object.values(simulationData).some(section => 
      section.some(p => p.kapitaina === 1)
    );
    
    if (hasCaptain) {
      player.kapitaina = 0;
    }
  }
  
  simulationData[addPlayerSection].push(player);
  saveAndRender();
  closeAddPlayerModal();
}

// ============= GUARDADO Y ACTUALIZACIÓN =============
function saveAndRender() {
  saveSimulationDataForTeam(currentTeam, simulationData);
  renderAllSections();
  document.querySelectorAll('.context-menu').forEach(m => m.style.display = 'none');
  document.querySelectorAll('.submenu').forEach(m => m.style.display = 'none');
  
  // Actualizar merkatuPlayers si Screen 2 está activa
  const screen2 = document.getElementById('screen2');
  if (screen2 && screen2.classList.contains('active')) {
    updateMerkatuPlayersFromSimulationData();
    renderMerkatuPositions();
  }
}

function resetSimulation() {
  // Limpiar datos del equipo actual
  localStorage.removeItem(`merkatuSim_${currentTeam}`);
  location.reload();
}

function updateLangBtn() {
  // Menú lateral (usa t() con claves del menú)
  document.getElementById('menu-plantilla').textContent = t('menu.plantilla');
  document.getElementById('menu-once').textContent = t('menu.once');
  document.getElementById('menu-merkatu').textContent = t('menu.merkatu');
  document.getElementById('pageTitle').textContent = t('merkatuSim.pageTitle');
  document.getElementById('screenBtn1').textContent = t('merkatuSim.gestionarPlantilla');
  document.getElementById('screenBtn2').textContent = t('merkatuSim.onceEnCampo');
  document.getElementById('porterosTitle').textContent = t('merkatuSim.porterosTitle');
  document.getElementById('defensasTitle').textContent = t('merkatuSim.defensasTitle');
  document.getElementById('centrocampistasTitle').textContent = t('merkatuSim.centrocampistasTitle');
  document.getElementById('delanterosTitle').textContent = t('merkatuSim.delanterosTitle');
  document.getElementById('salidasTitle').textContent = t('merkatuSim.salidasTitle');
  document.getElementById('langBtn').textContent = window.currentLang === 'es' ? 'Eus' : 'Cast';
  document.getElementById('resetBtn').textContent = t('merkatuSim.deshacer');
  document.getElementById('modalTitle').textContent = t('merkatuSim.anadirJugador');
  document.getElementById('addPlayerCloseBtn').textContent = t('merkatuSim.cerrar');
  document.getElementById('dorsalTitle').textContent = t('merkatuSim.editar');
  document.getElementById('dorsalCancelBtn').textContent = t('merkatuSim.cancelar');
  document.getElementById('dorsalSaveBtn').textContent = t('merkatuSim.guardar');
  // Actualizar label de equipo
  if (document.getElementById('equipoLabel')) {
    document.getElementById('equipoLabel').textContent = t('merkatuSim.team');
  }
  if (document.getElementById('dorsalTitle')) {
    document.getElementById('dorsalTitle').textContent = t('merkatuSim.editar');
    document.getElementById('dorsalCancelBtn').textContent = t('merkatuSim.cancelar');
    document.getElementById('dorsalSaveBtn').textContent = t('merkatuSim.guardar');
  }
  // Sincronizar selector de equipo
  const equipoSelect = document.getElementById('equipoSelect');
  if (equipoSelect) {
    equipoSelect.value = currentTeam;
  }
  renderAllSections();
}
document.getElementById('langBtn').onclick = function() {
  const newLang = window.currentLang === 'es' ? 'eu' : 'es';
  window.currentLang = newLang;
  i18next.changeLanguage(newLang);
  updateLangBtn();
  // Actualizar UI del hamaikakoa/once si está inicializado
  if (window.hamaiakolaInitialized) {
    updateMerkatuHamaiakolaUI();
  }
};

document.getElementById('resetBtn').onclick = resetSimulation;

// ============= FUNCIONES DE PANTALLAS =============
function switchMerkatuScreen(screenNum) {
  // Cambiar clases de pantalla
  document.getElementById('screen1').classList.toggle('active', screenNum === 1);
  document.getElementById('screen2').classList.toggle('active', screenNum === 2);
  
  // Cambiar botones activos
  document.getElementById('screenBtn1').classList.toggle('active', screenNum === 1);
  document.getElementById('screenBtn2').classList.toggle('active', screenNum === 2);
  
  // Si cambio a pantalla 2 y no está inicializado, inicializar
  if (screenNum === 2 && !window.hamaiakolaInitialized) {
    // Usar setTimeout para asegurar que el DOM esté actualizado
    setTimeout(() => {
      initMerkatuHamaikakoa();
      window.hamaiakolaInitialized = true;
    }, 0);
  } else if (screenNum === 2 && window.hamaiakolaInitialized) {
    // Si ya fue inicializado, actualizar jugadores con cambios de Screen 1 y re-renderizar
    updateMerkatuPlayersFromSimulationData();
    renderMerkatuPositions();
  }
}

// Cerrar modales al hacer clic fuera
document.getElementById('addPlayerModal').addEventListener('click', function(e) {
  if (e.target === this) {
    if (editPlayerSection !== null) {
      closeEditModal();
    } else {
      closeAddPlayerModal();
    }
  }
});

document.getElementById('dorsalModal').addEventListener('click', function(e) {
  if (e.target === this) {
    closeDorsalModal();
  }
});

// Cerrar menús al hacer clic fuera
document.addEventListener('click', () => {
  document.querySelectorAll('.context-menu').forEach(m => m.style.display = 'none');
  document.querySelectorAll('.submenu').forEach(m => m.style.display = 'none');
});

// Enter en dorsal modal
document.getElementById('dorsalInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') saveDorsal();
});

// Función de inicialización async para esperar a i18next
async function initMerkatuSim() {
  await initializeI18n();
  
  // Inicializar DB
  initDB();
  
  // Cargar datos
  await loadPlantilla();
  
  // Ahora que i18next está listo, actualizar UI y renderizar
  updateLangBtn();
  renderAllSections();
}

// Event listener para el selector de equipo
const equipoSelect = document.getElementById('equipoSelect');
if (equipoSelect) {
  equipoSelect.addEventListener('change', function() {
    const previousTeam = currentTeam;
    // Guardar estado del equipo anterior (incluyendo campo si estamos en screen 2)
    saveSimulationDataForTeam(previousTeam, simulationData);
    if (previousTeam === currentTeam) {
      saveMerkatuState(); // Guardar estado del campo del equipo anterior
    }
    
    currentTeam = this.value;
    localStorage.setItem('team', currentTeam);
    reinitializeByTeam();
    renderAllSections();
    // Limpiar estado del campo al cambiar de equipo
    merkatuAssigned = Array(11).fill(null);
    window.merkatuCambiosOnce = {};
    merkatuCurrentFormation = '4-2-3-1';
  });
}

// Iniciar cuando DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMerkatuSim);
} else {
  initMerkatuSim();
}

// ============= SEGUNDA PANTALLA: HAMAIKAKOA INTEGRADO =============
// Variables para la segunda pantalla (hamaikakoa)
let merkatuPlayers = [];
let merkatuCurrentFormation = '4-2-3-1';
let merkatuAssigned = Array(11).fill(null);
window.merkatuCambiosOnce = {};
let merkatuCambioEnPosicion = null;

// Funciones para guardar/cargar estado del campo
function saveMerkatuState() {
  const state = {
    assigned: merkatuAssigned,
    cambios: window.merkatuCambiosOnce || {},
    formation: merkatuCurrentFormation
  };
  localStorage.setItem(`merkatuState_${currentTeam}`, JSON.stringify(state));
}

function loadMerkatuState() {
  const stored = localStorage.getItem(`merkatuState_${currentTeam}`);
  if (stored) {
    try {
      const state = JSON.parse(stored);
      merkatuAssigned = state.assigned || Array(11).fill(null);
      window.merkatuCambiosOnce = state.cambios || {};
      merkatuCurrentFormation = state.formation || '4-2-3-1';
    } catch (e) {
      console.error('Error loading merkatuState:', e);
      merkatuAssigned = Array(11).fill(null);
      window.merkatuCambiosOnce = {};
      merkatuCurrentFormation = '4-2-3-1';
    }
  }
}

function clearMerkatuStateForTeam() {
  localStorage.removeItem(`merkatuState_${currentTeam}`);
  merkatuAssigned = Array(11).fill(null);
  window.merkatuCambiosOnce = {};
  merkatuCurrentFormation = '4-2-3-1';
}

const formations = {
  '4-2-3-1': [
    { x: 60, y: 100, role: 'EI' }, { x: 260, y: 20, role: 'DC' }, { x: 460, y: 100, role: 'ED' },
    { x: 260, y: 190, role: 'MCO' }, { x: 160, y: 310, role: 'MCD' }, { x: 360, y: 310, role: 'MCD' },
    { x: 180, y: 470, role: 'DFC' }, { x: 340, y: 470, role: 'DFC' }, { x: 35, y: 420, role: 'LI' },
    { x: 485, y: 420, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '4-3-3': [
    { x: 60, y: 60, role: 'EI' }, { x: 260, y: 20, role: 'DC' }, { x: 460, y: 60, role: 'ED' },
    { x: 360, y: 190, role: 'MCO' }, { x: 160, y: 210, role: 'MC' }, { x: 260, y: 310, role: 'MCD' },
    { x: 180, y: 470, role: 'DFC' }, { x: 340, y: 470, role: 'DFC' }, { x: 35, y: 420, role: 'LI' },
    { x: 485, y: 420, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '4-4-2 (1)': [
    { x: 160, y: 40, role: 'DDC' }, { x: 360, y: 40, role: 'DDC' }, { x: 420, y: 190, role: 'MCO' },
    { x: 100, y: 190, role: 'MC' }, { x: 190, y: 310, role: 'MCD' }, { x: 330, y: 310, role: 'MCD' },
    { x: 180, y: 470, role: 'DFC' }, { x: 340, y: 470, role: 'DFC' }, { x: 35, y: 420, role: 'LI' },
    { x: 485, y: 420, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '4-4-2 (2)': [
    { x: 160, y: 40, role: 'DDC' }, { x: 360, y: 40, role: 'DDC' }, { x: 260, y: 160, role: 'MCO' },
    { x: 100, y: 220, role: 'MC' }, { x: 420, y: 220, role: 'MC' }, { x: 260, y: 320, role: 'MCD' },
    { x: 180, y: 470, role: 'DFC' }, { x: 340, y: 470, role: 'DFC' }, { x: 35, y: 420, role: 'LI' },
    { x: 485, y: 420, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '3-4-1-2': [
    { x: 160, y: 30, role: 'DDC' }, { x: 360, y: 30, role: 'DDC' }, { x: 260, y: 150, role: 'MCO' },
    { x: 160, y: 270, role: 'MC' }, { x: 360, y: 280, role: 'MCD' }, { x: 260, y: 440, role: 'DFC' },
    { x: 120, y: 490, role: 'DFC' }, { x: 400, y: 490, role: 'DFC' }, { x: 35, y: 360, role: 'CAI' },
    { x: 485, y: 360, role: 'CAD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '5-3-2': [
    { x: 160, y: 40, role: 'DDC' }, { x: 360, y: 40, role: 'DDC' }, { x: 380, y: 180, role: 'MCO' },
    { x: 140, y: 200, role: 'MC' }, { x: 260, y: 300, role: 'MCD' }, { x: 260, y: 440, role: 'DFC' },
    { x: 120, y: 490, role: 'DFC' }, { x: 400, y: 490, role: 'DFC' }, { x: 35, y: 360, role: 'CAI' },
    { x: 485, y: 360, role: 'CAD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '5-2-3': [
    { x: 60, y: 120, role: 'EI' }, { x: 260, y: 20, role: 'DC' }, { x: 460, y: 120, role: 'ED' },
    { x: 160, y: 280, role: 'MC' }, { x: 360, y: 280, role: 'MCD' }, { x: 260, y: 440, role: 'DFC' },
    { x: 120, y: 490, role: 'DFC' }, { x: 400, y: 490, role: 'DFC' }, { x: 35, y: 360, role: 'CAI' },
    { x: 485, y: 360, role: 'CAD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '5-1-3-1': [
    { x: 60, y: 100, role: 'EI' }, { x: 260, y: 20, role: 'DC' }, { x: 460, y: 100, role: 'ED' },
    { x: 260, y: 220, role: 'MCO' }, { x: 140, y: 320, role: 'MC' }, { x: 380, y: 320, role: 'MCD' },
    { x: 260, y: 440, role: 'DFC' }, { x: 120, y: 490, role: 'DFC' }, { x: 400, y: 490, role: 'DFC' },
    { x: 35, y: 360, role: 'CAI' }, { x: 485, y: 360, role: 'CAD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '4-5-1': [
    { x: 60, y: 140, role: 'EI' }, { x: 460, y: 140, role: 'ED' }, { x: 260, y: 20, role: 'DC' },
    { x: 100, y: 210, role: 'MC' }, { x: 260, y: 190, role: 'MCO' }, { x: 420, y: 210, role: 'MCD' },
    { x: 160, y: 340, role: 'MC' }, { x: 360, y: 340, role: 'MC' }, { x: 35, y: 420, role: 'LI' },
    { x: 485, y: 420, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '4-2-1-2-1': [
    { x: 160, y: 125, role: 'MCO' }, { x: 260, y: 10, role: 'DC' }, { x: 360, y: 125, role: 'MCO' },
    { x: 110, y: 260, role: 'MC' }, { x: 410, y: 260, role: 'MC' }, { x: 260, y: 340, role: 'MCD' },
    { x: 180, y: 470, role: 'DFC' }, { x: 340, y: 470, role: 'DFC' }, { x: 35, y: 400, role: 'LI' },
    { x: 485, y: 400, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ],
  '4-1-2-2-1': [
    { x: 160, y: 125, role: 'MCO' }, { x: 260, y: 10, role: 'DC' }, { x: 360, y: 125, role: 'MCO' },
    { x: 110, y: 260, role: 'MC' }, { x: 410, y: 260, role: 'MC' }, { x: 260, y: 340, role: 'MCD' },
    { x: 180, y: 470, role: 'DFC' }, { x: 340, y: 470, role: 'DFC' }, { x: 35, y: 400, role: 'LI' },
    { x: 485, y: 400, role: 'LD' }, { x: 260, y: 600, role: 'POR' }
  ]
};

function updateMerkatuPlayersFromSimulationData() {
  // Reconstruir merkatuPlayers desde simulationData para reflejar cambios de Screen 1
  merkatuPlayers = [];
  const allPlayers = [
    ...simulationData.porteros,
    ...simulationData.defensas,
    ...simulationData.centrocampistas,
    ...simulationData.delanteros
  ];
  const dorsalField = currentTeam === 'sanse' ? 'dorsal2' : 'dorsal';
  
  allPlayers.forEach(player => {
    merkatuPlayers.push({
      dorsal: player[dorsalField] || player.dorsal || 99,
      name: player.name,
      fullname: player.fullname || player.name,
      img: getPlayerImgUrl(player),
      positions: Array.isArray(player.positions) ? player.positions : (player.positions ? [player.positions] : []),
      url_name: player.url_name
    });
  });
  
  merkatuPlayers.sort((a, b) => {
    const dorsalA = parseInt(a.dorsal) || 99;
    const dorsalB = parseInt(b.dorsal) || 99;
    return dorsalA - dorsalB;
  });
}

function initMerkatuHamaikakoa() {
  // Construir lista de jugadores desde simulationData
  updateMerkatuPlayersFromSimulationData();
  
  // Cargar estado guardado del campo
  loadMerkatuState();
  if (document.getElementById('formationSelect2')) {
    document.getElementById('formationSelect2').value = merkatuCurrentFormation;
  }
  
  // Configurar event listeners
  document.getElementById('formationSelect2').addEventListener('change', function() {
    merkatuCurrentFormation = this.value;
    saveMerkatuState();
    renderMerkatuPositions();
  });
  
  document.getElementById('filterByPosition2').addEventListener('change', function() {
    renderMerkatuPositions();
  });
  
  document.getElementById('watermarkToggle2').addEventListener('change', function() {
    const fieldImg = document.querySelector('#screen2 .field-img');
    if (this.checked) {
      fieldImg.src = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/Zelaia.jpg';
    } else {
      fieldImg.src = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/Zelaia2.jpg';
    }
  });
  
  document.getElementById('downloadBtn2').onclick = downloadMerkatuOnce;
  document.getElementById('clearBtn2').onclick = clearMerkatuOnce;
  
  // Re-renderizar cuando cambia el tamaño de la ventana
  window.addEventListener('resize', () => {
    renderMerkatuPositions();
  });
  
  renderMerkatuPositions();
  updateMerkatuHamaiakolaUI();
}

function getPlayerImgUrl(player) {
  let imgFolder = '2025-26';
  if (currentTeam === 'f') {
    imgFolder = 'f_2025-26';
  }
  
  if (player.customImageId) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
  
  return `https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/${imgFolder}/${player.url_name}.jpg`;
}

function renderMerkatuPositions() {
  const container = document.getElementById('positions2');
  if (!container) return;
  container.innerHTML = '';
  
  const fieldContainer = document.querySelector('#screen2 .field-container');
  let currentWidth = fieldContainer ? fieldContainer.offsetWidth : 650;
  
  if (currentWidth === 0) {
    currentWidth = 650;
  }
  
  const scale = currentWidth / 650;
  const positions = formations[merkatuCurrentFormation];
  if (!positions) return;
  
  positions.forEach((pos, idx) => {
    const div = document.createElement('div');
    div.className = 'player-pos' + (merkatuAssigned[idx] ? ' selected' : '');
    
    const scaledX = pos.x * scale;
    const scaledY = pos.y * scale;
    const offset = merkatuAssigned[idx] ? 0 : 10;
    
    div.style.left = (scaledX + (offset * scale)) + 'px';
    div.style.top = (scaledY + (offset * scale)) + 'px';
    
    const baseSize = merkatuAssigned[idx] ? 130 : 110;
    const scaledSize = baseSize * scale;
    div.style.width = scaledSize + 'px';
    div.style.height = scaledSize + 'px';
    
    div.onclick = (e) => {
      e.stopPropagation();
      openMerkatuPlayerList(idx);
    };
    
    div.oncontextmenu = (e) => {
      e.preventDefault();
      if (!merkatuAssigned[idx]) return;
      openMerkatuContextMenu(e, idx);
    };
    
    if (merkatuAssigned[idx]) {
      const scaledFontSize = 0.8 * scale;
      div.innerHTML = `
        <div style="position:relative;width:100%;height:100%;">
          <img class="player-img" src="${merkatuAssigned[idx].img}" title="${merkatuAssigned[idx].name} (${merkatuAssigned[idx].dorsal})" />
          <div class="dorsal-badge-onfield" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis; font-size:${scaledFontSize}em;">
            ${merkatuAssigned[idx].dorsal !== null && merkatuAssigned[idx].dorsal !== undefined ? merkatuAssigned[idx].dorsal : ''}. ${merkatuAssigned[idx].name}
          </div>
        </div>`;
    } else {
      div.innerHTML = '<span class="plus-icon">+</span>';
    }
    
    container.appendChild(div);
    
    // Mostrar suplentes bajo el círculo
    const cambios = window.merkatuCambiosOnce || {};
    if (Array.isArray(cambios[idx]) && cambios[idx].length > 0) {
      const cambioLabels = document.createElement('div');
      cambioLabels.style.position = 'absolute';
      cambioLabels.style.left = (pos.x + 11.5) + 'px';
      cambioLabels.style.top = (pos.y + 130) + 'px';
      cambioLabels.style.width = '110px';
      cambioLabels.style.pointerEvents = 'none';
      cambioLabels.style.zIndex = '10';
      cambioLabels.style.textAlign = 'center';
      cambioLabels.style.display = 'flex';
      cambioLabels.style.flexDirection = 'column';
      cambioLabels.style.gap = '2px';
      cambios[idx].forEach(nombre => {
        const cambioLabel = document.createElement('div');
        cambioLabel.textContent = nombre;
        cambioLabel.style.color = '#fff';
        cambioLabel.style.fontWeight = 'bold';
        cambioLabel.style.fontSize = '1em';
        cambioLabel.style.textShadow = '0 0 2px #0077cc, 0 0 2px #0077cc, 0 0 2px #0077cc';
        cambioLabels.appendChild(cambioLabel);
      });
      container.appendChild(cambioLabels);
    }
  });
}

function openMerkatuPlayerList(idx) {
  const modal = document.getElementById('playerListModal2');
  modal.style.display = 'flex';
  const list = document.getElementById('playerList2');
  list.innerHTML = '';
  
  // Actualizar título y botón de cerrar del modal con la traducción actual
  const modalTitle = document.querySelector('#playerListModal2 .player-list-box h3');
  if (modalTitle) modalTitle.textContent = t('hamaikakoa.seleccionaJugador');
  const closeBtn = document.querySelector('#playerListModal2 .close-modal-btn');
  if (closeBtn) closeBtn.textContent = t('hamaikakoa.cerrar');
  
  // Cerrar modal al hacer clic fuera
  modal.onclick = function(e) {
    if (e.target === modal) {
      closePlayerList2();
    }
  };
  
  const filterActive = document.getElementById('filterByPosition2').checked;
  const positions = formations[merkatuCurrentFormation];
  const posRole = positions[idx].role;
  
  const filteredPlayers = merkatuPlayers.filter(player => {
    const hasDefinedPositions = player.positions && Array.isArray(player.positions) && player.positions.length > 0;
    const matchesPosition = !hasDefinedPositions || player.positions.includes(posRole);
    const shouldShow = !filterActive || matchesPosition;
    return shouldShow;
  }).sort((a, b) => {
    const dorsalA = parseInt(a.dorsal) || 99;
    const dorsalB = parseInt(b.dorsal) || 99;
    return dorsalA - dorsalB;
  });
  
  filteredPlayers.forEach(player => {
    
    const item = document.createElement('div');
    item.className = 'player-list-item';
    item.onclick = () => {
      const getId = p => p ? (p.dorsal ? p.dorsal : p.name) : null;
      const playerId = getId(player);
      const cambios = window.merkatuCambiosOnce || {};
      
      Object.keys(cambios).forEach(k => {
        cambios[k] = cambios[k].filter(n => n !== player.name);
      });
      
      const currentIdx = merkatuAssigned.findIndex(p => getId(p) === playerId);
      if (currentIdx !== -1 && currentIdx !== idx) {
        const temp = merkatuAssigned[idx];
        merkatuAssigned[idx] = player;
        merkatuAssigned[currentIdx] = temp;
        if (Array.isArray(cambios[currentIdx]) && cambios[currentIdx].length > 0) {
          const nuevoTitular = cambios[currentIdx][0];
          const nuevoPlayer = merkatuPlayers.find(p => p.name === nuevoTitular);
          merkatuAssigned[currentIdx] = nuevoPlayer;
          cambios[currentIdx] = cambios[currentIdx].filter(n => n !== nuevoTitular);
          window.merkatuCambiosOnce = cambios;
        }
        if (Array.isArray(cambios[idx]) && !cambios[idx].includes(temp && temp.name) && temp) {
          cambios[idx].push(temp.name);
        }
      } else {
        merkatuAssigned[idx] = player;
      }
      window.merkatuCambiosOnce = cambios;
      saveMerkatuState();
      modal.style.display = 'none';
      renderMerkatuPositions();
    };
    
    item.innerHTML =
      '<span class="player-list-dorsal" style="display:inline-block;min-width:22px;max-width:22px;text-align:right;">' + (player.dorsal ? player.dorsal : '&nbsp;') + '</span>' +
      '<img class="player-list-img" src="' + player.img + '" />' +
      '<span class="player-list-name">' + player.name + '</span>';
    
    list.appendChild(item);
  });
}

function openMerkatuCambioList(idx) {
  const modal = document.getElementById('playerListModal2');
  modal.style.display = 'flex';
  const list = document.getElementById('playerList2');
  list.innerHTML = '';
  
  // Actualizar título y botón de cerrar del modal con la traducción actual
  const modalTitle = document.querySelector('#playerListModal2 .player-list-box h3');
  if (modalTitle) modalTitle.textContent = t('hamaikakoa.seleccionaJugador');
  const closeBtn = document.querySelector('#playerListModal2 .close-modal-btn');
  if (closeBtn) closeBtn.textContent = t('hamaikakoa.cerrar');
  
  // Cerrar modal al hacer clic fuera
  modal.onclick = function(e) {
    if (e.target === modal) {
      closePlayerList2();
    }
  };
  
  const filterActive = document.getElementById('filterByPosition2').checked;
  const positions = formations[merkatuCurrentFormation];
  const posRole = positions[idx].role;
  const cambios = window.merkatuCambiosOnce || {};
  if (!Array.isArray(cambios[idx])) cambios[idx] = [];
  
  // Filtrar jugadores y ordenar globalmente por dorsal (numérica)
  const filteredPlayers = merkatuPlayers.filter(player => {
    // Si hay filtro activo: 
    // - Mostrar jugadores con positions definidas que coincidan con la posición
    // - Mostrar TODOS los jugadores sin positions definidas (pueden ocupar cualquier posición)
    const hasDefinedPositions = player.positions && Array.isArray(player.positions) && player.positions.length > 0;
    const matchesPosition = !hasDefinedPositions || player.positions.includes(posRole);
    const shouldShow = !filterActive || matchesPosition;
    return shouldShow;
  }).sort((a, b) => {
    const dorsalA = parseInt(a.dorsal) || 99;
    const dorsalB = parseInt(b.dorsal) || 99;
    return dorsalA - dorsalB;
  });
  
  filteredPlayers.forEach(player => {
    
    const item = document.createElement('div');
    item.className = 'player-list-item';
    const isSelected = cambios[idx].includes(player.name);
    item.style.background = isSelected ? '#e0f7fa' : '';
    item.onclick = () => {
      if (isSelected) {
        cambios[idx] = cambios[idx].filter(n => n !== player.name);
      } else {
        const getId = p => p ? (p.dorsal ? p.dorsal : p.name) : null;
        const playerId = getId(player);
        const titularIdx = merkatuAssigned.findIndex(p => getId(p) === playerId);
        if (titularIdx !== -1) {
          if (Array.isArray(cambios[titularIdx]) && cambios[titularIdx].length > 0) {
            const nuevoTitular = cambios[titularIdx][0];
            const nuevoPlayer = merkatuPlayers.find(p => p.name === nuevoTitular);
            merkatuAssigned[titularIdx] = nuevoPlayer;
            cambios[titularIdx] = cambios[titularIdx].filter(n => n !== nuevoTitular);
          } else {
            merkatuAssigned[titularIdx] = null;
          }
          cambios[idx].push(player.name);
          Object.keys(cambios).forEach(k => {
            if (k != idx.toString()) cambios[k] = cambios[k].filter(n => n !== player.name);
          });
        } else {
          let foundIdx = null;
          Object.keys(cambios).forEach(k => {
            if (cambios[k].includes(player.name)) foundIdx = k;
          });
          if (foundIdx !== null && foundIdx != idx) {
            cambios[foundIdx] = cambios[foundIdx].filter(n => n !== player.name);
            cambios[idx].push(player.name);
          } else {
            cambios[idx].push(player.name);
          }
        }
      }
      window.merkatuCambiosOnce = cambios;
      saveMerkatuState();
      modal.style.display = 'none';
      renderMerkatuPositions();
    };
    
    item.innerHTML =
      '<span class="player-list-dorsal" style="display:inline-block;min-width:22px;max-width:22px;text-align:right;">' + (player.dorsal ? player.dorsal : '&nbsp;') + '</span>' +
      '<img class="player-list-img" src="' + player.img + '" />' +
      '<span class="player-list-name">' + player.name + '</span>';
    
    list.appendChild(item);
  });
}

function openMerkatuContextMenu(e, idx) {
  const oldMenu = document.getElementById('contextMenu');
  if (oldMenu) oldMenu.remove();
  
  const menu = document.createElement('div');
  menu.id = 'contextMenu';
  menu.style.position = 'fixed';
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.style.background = '#fff';
  menu.style.border = '1px solid #0077cc';
  menu.style.borderRadius = '8px';
  menu.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
  menu.style.zIndex = '9999';
  menu.style.padding = '8px 0';
  menu.style.minWidth = '160px';
  menu.style.fontSize = '1em';
  
  const lang = window.currentLang || 'es';
  const opts = [
    { text: t('hamaikakoa.quitarJugador'), action: () => { merkatuAssigned[idx] = null; if (window.merkatuCambiosOnce) delete window.merkatuCambiosOnce[idx]; saveMerkatuState(); renderMerkatuPositions(); } },
    { text: t('hamaikakoa.jugadorSuplente'), action: () => { merkatuCambioEnPosicion = idx; openMerkatuCambioList(idx); } }
  ];
  
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt.text;
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.padding = '10px 18px';
    btn.style.textAlign = 'left';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.onmouseover = () => btn.style.background = '#f0f8ff';
    btn.onmouseout = () => btn.style.background = 'none';
    btn.onclick = () => {
      opt.action();
      menu.remove();
    };
    menu.appendChild(btn);
  });
  
  document.body.appendChild(menu);
  
  setTimeout(() => {
    document.addEventListener('click', function handler(ev) {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', handler);
      }
    });
  }, 10);
}

function closePlayerList2() {
  document.getElementById('playerListModal2').style.display = 'none';
}

function downloadMerkatuOnce() {
  alert('Coming soon: Download feature');
}

function clearMerkatuOnce() {
  clearMerkatuStateForTeam();
  renderMerkatuPositions();
}

function updateMerkatuHamaiakolaUI() {
  document.getElementById('formationText2').textContent = t('hamaikakoa.formacion');
  document.getElementById('filterText2').textContent = t('hamaikakoa.filter');
  document.getElementById('watermarkText2').textContent = t('hamaikakoa.watermark');
  document.getElementById('downloadBtn2').textContent = t('hamaikakoa.descargar');
  document.getElementById('clearBtn2').textContent = t('hamaikakoa.limpiar');
  const modalTitle = document.querySelector('#playerListModal2 .player-list-box h3');
  if (modalTitle) modalTitle.textContent = t('hamaikakoa.seleccionaJugador');
  const closeBtn = document.querySelector('#playerListModal2 .close-modal-btn');
  if (closeBtn) closeBtn.textContent = t('hamaikakoa.cerrar');
}