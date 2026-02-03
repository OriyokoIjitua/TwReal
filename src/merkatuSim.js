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
    const base = 'vertical-align:middle; width:22px; height:16px; border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,0.10);';
    return noDeform.includes(pais) ? base + ' object-fit:contain;' : base;
  };
  
  // Construir HTML de banderas si no es personalizado
  let flagsHtml = '';
  if (!player.customImageId && player.pais) {
    flagsHtml = `
        <img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${player.pais}.png" alt="flag" style="${getFlagStyle(player.pais)} margin-right:2px;">
        ${player.pais2 ? `<img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${player.pais2}.png" alt="flag2" style="${getFlagStyle(player.pais2)} margin-left:2px;">` : ''}
        ${player.pais3 ? `<img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${player.pais3}.png" alt="flag3" style="${getFlagStyle(player.pais3)} margin-left:2px;">` : ''}
        ${player.pais4 ? `<img src="https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/banderak/${player.pais4}.png" alt="flag4" style="${getFlagStyle(player.pais4)} margin-left:2px;">` : ''}`;
  }
  
  card.innerHTML = `
    <img class="player-img" src="${imgSrc}" 
         alt="${player.name}" onerror="this.src='https://via.placeholder.com/72?text=${player.name}'">
    <div class="player-info">
      <span class="player-name">
        ${flagsHtml}
        ${player.name}
      </span>
      <span class="player-fullname">${player.fullname || ''}</span>
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
      <button class="context-menu-item" onclick="openDorsalModal('${sectionKey}', ${idx})">
        ${t('merkatuSim.cambiarDorsal')}
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
      <label class="modal-label">${t('merkatuSim.foto')}</label>
      <input type="file" class="modal-input" id="custom-foto" accept="image/*">
    </div>
    <button class="modal-btn modal-btn-primary" style="width: 100%;" onclick="addCustomPlayer()">
      ${t('merkatuSim.seleccionar')}
    </button>
  `;
}

function addCustomPlayer() {
  const nombre = document.getElementById('custom-nombre').value;
  const deportivo = document.getElementById('custom-deportivo').value;
  const dorsal = document.getElementById('custom-dorsal').value || '99';
  const fotoFile = document.getElementById('custom-foto').files[0];

  if (!nombre) {
    alert('Completa el nombre');
    return;
  }

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
    const newPlayer = {
      tipo: 'jugador',
      name: deportivo || nombre,
      fullname: nombre,
      url_name: nombre.replace(/\s+/g, '_').toLowerCase(),
      dorsal: parseInt(dorsal),
      tempId: Date.now() + Math.random()
    };
    addPlayerToSimulation(newPlayer);
  }
}

function addPlayerToSimulation(player) {
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
  document.getElementById('dorsalTitle').textContent = t('merkatuSim.cambiarDorsal');
  document.getElementById('dorsalCancelBtn').textContent = t('merkatuSim.cancelar');
  document.getElementById('dorsalSaveBtn').textContent = t('merkatuSim.guardar');
  // Actualizar label de equipo
  if (document.getElementById('equipoLabel')) {
    document.getElementById('equipoLabel').textContent = t('merkatuSim.team');
  }
  if (document.getElementById('dorsalTitle')) {
    document.getElementById('dorsalTitle').textContent = t('merkatuSim.cambiarDorsal');
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
    closeAddPlayerModal();
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
