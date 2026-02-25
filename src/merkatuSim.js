// ============= GESTIÓN DE DATOS =============
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
    request.onsuccess = () => resolve(request.result?.data);
    request.onerror = () => reject(tx.error);
  });
};

// ============= CARGA INICIAL =============
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
  
  // Reinicializar datos según el equipo seleccionado
  reinitializeByTeam();
  
  // No renderizar aquí - esperar a que i18next esté completamente listo
}

function reinitializeByTeam() {
  // Recuperar datos guardados del equipo actual
  const savedData = getSimulationDataForTeam(currentTeam);
  
  // Si hay datos guardados, usarlos; si no, inicializar con datos por defecto
  if (savedData.porteros.length > 0 || savedData.defensas.length > 0 || 
      savedData.centrocampistas.length > 0 || savedData.delanteros.length > 0 || 
      savedData.salidas.length > 0) {
    simulationData = savedData;
  } else {
    // Inicializar con datos por defecto si no hay guardados
    simulationData = {
      porteros: [],
      defensas: [],
      centrocampistas: [],
      delanteros: [],
      salidas: []
    };
    
    const excludeUrlNames = ['jon_ansotegi', 'imanol_agirretxe', 'sergio_francisco', 'iosu_rivas', 'imanol_alguacil', 'mikel_labaka'];
    let playersToLoad = [];
    let salidasToLoad = [];
    
    if (currentTeam === 'sanse') {
      // Sanse: solo 'dual' y 'sanse' inicialmente (no 'sanse-dual' ni 'dual-ber-bi')
      playersToLoad = plantillaCompleta.filter(p => (p.tipo === 'sanse' || p.tipo === 'dual') && !excludeUrlNames.includes(p.url_name));
      salidasToLoad = []; // Salidas-sanse seleccionables pero no cargadas al iniciar
    } else if (currentTeam === 'f') {
      // Real Sociedad F: solo tipo 'jugador' inicialmente (sin 'dual', 'salida' ni entrenador)
      playersToLoad = plantillaFCompleta.filter(p => p.tipo === 'jugador' && !excludeUrlNames.includes(p.url_name));
      salidasToLoad = []; // No cargar salidas al iniciar
    } else {
      // Real Sociedad (default): solo 'jugador' al iniciar (dual y dual-ber-bi seleccionables pero no cargados)
      playersToLoad = plantillaCompleta.filter(p => p.tipo === 'jugador' && !excludeUrlNames.includes(p.url_name));
      salidasToLoad = []; // No cargar salidas al iniciar
    }
    
    // Agregar jugadores
    playersToLoad.forEach(player => {
      const posMap = { 'POR': 'porteros', 'DEF': 'defensas', 'MED': 'centrocampistas', 'DEL': 'delanteros' };
      if (posMap[player.pos]) {
        simulationData[posMap[player.pos]].push({ ...player, tempId: Date.now() + Math.random() });
      }
    });
    
    // Agregar salidas
    salidasToLoad.forEach(player => {
      simulationData.salidas.push({ ...player, tempId: Date.now() + Math.random() });
    });
    
    saveSimulationDataForTeam(currentTeam, simulationData);
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
  simulationData[section].sort((a, b) => (a[dorsalField] || 0) - (b[dorsalField] || 0));
}

function renderSection(sectionKey, posFilter) {
  sortPlayersByDorsal(sectionKey);
  const container = document.getElementById(sectionKey + 'Container');
  container.innerHTML = '';
  const players = simulationData[sectionKey] || [];
  
  players.forEach((player, idx) => {
    const card = createPlayerCard(player, sectionKey, idx);
    container.appendChild(card);
  });
  
  // Botón de agregar jugador
  const addCard = document.createElement('div');
  addCard.className = 'player-card add-btn';
  addCard.innerHTML = '<div class="add-btn-icon">+</div>';
  addCard.onclick = () => openAddPlayerModal(sectionKey);
  container.appendChild(addCard);
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
         alt="${player.name}" onerror="this.src='https://via.placeholder.com/72?text=${player.name}'">
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
    if (btn !== event?.target) btn.classList.remove('active');
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
          pais: paisArray.length > 0 ? paisArray : ['España'],
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
      pais: paisArray.length > 0 ? paisArray : ['España'],
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
  changeLanguage(newLang);
  updateLangBtn();
};

document.getElementById('resetBtn').onclick = resetSimulation;

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
    // Guardar estado del equipo anterior antes de cambiar
    saveSimulationDataForTeam(previousTeam, simulationData);
    
    currentTeam = this.value;
    localStorage.setItem('team', currentTeam);
    reinitializeByTeam();
    renderAllSections();
  });
}

// Iniciar cuando DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMerkatuSim);
} else {
  initMerkatuSim();
}