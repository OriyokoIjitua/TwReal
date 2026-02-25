// Global variables
let jugadores = [];
let entrenadores = [];
let salidas = [];
let sanseJugadores = [];
let sanseEntrenadores = [];
let sanseSalidas = [];
let fJugadores = [];
let fEntrenadores = [];
let fSalidas = [];
let currentTeam = localStorage.getItem('team') || 'real';

// Audio management
let currentAudio = null;
let currentBtn = null;
let audioPositions = {};

// Constants
const EASTER_EGG_USERS = ['imanol_alguacil', 'edna_imade'];
const IMG_BASE_URL = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/';
const JSON_BASE_URL = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/json/';
const AUDIO_BASE_URL = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/aud/';

function getFlagStyle(pais) {
  const noDeform = ['NafarroaG', 'Gipuzkoa', 'Bizkaia', 'Araba', 'Lapurdi', 'NafarroaB', 'Zuberoa'];
  const baseStyle = 'vertical-align:middle; width:24px; height:16px;';
  const withBox = baseStyle + ' border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,0.10);';
  return noDeform.includes(pais) ? baseStyle + ' object-fit:contain;' : withBox;
}

function buildFlagsHtml(paisArray) {
  if (!paisArray || !Array.isArray(paisArray)) return '';
  
  return paisArray.map((pais, idx) => {
    if (!pais) return '';
    return `<img src="${IMG_BASE_URL}banderak/${pais}.png" alt="flag-${idx}" style="${getFlagStyle(pais)} margin-right:4px;">`;
  }).join('');
}

function formatBirthdateWithAge(jaioData) {
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
}


async function cargarDatosTemporada(temporada) {
  try {
    const data = await fetch(`${JSON_BASE_URL}plantilla_${temporada}.json`).then(r => r.json());

    jugadores = data.filter(ind => ind.tipo === 'jugador' || ind.tipo === 'dual' || ind.tipo === 'dual-ber-bi');
    entrenadores = data.filter(ind => ind.tipo === 'entrenador');
    salidas = data.filter(ind => ind.tipo === 'salida');
    sanseJugadores = data.filter(ind => ind.tipo === 'sanse' || ind.tipo === 'dual' || ind.tipo === 'sanse-dual' || ind.tipo === 'dual-ber-bi').sort((a, b) => a.dorsal2 - b.dorsal2);
    sanseEntrenadores = data.filter(ind => ind.tipo === 'entrenador-sanse');
    sanseSalidas = data.filter(ind => ind.tipo === 'salida-sanse');

    if (temporada === '2025-26') {
      try {
        const dataF = await fetch(`${JSON_BASE_URL}plantilla_f_2025-26.json`).then(r => r.json());
        fJugadores = dataF.filter(ind => ind.tipo === 'jugador' || ind.tipo === 'dual' || ind.tipo === 'dual-ber-bi');
        fEntrenadores = dataF.filter(ind => ind.tipo === 'entrenador');
        fSalidas = dataF.filter(ind => ind.tipo === 'salida');
      } catch (err) {
        console.error('Error cargando plantilla_f_2025-26.json:', err);
      }
    }

    const equipoSelect = document.getElementById('equipoSelect');
    const equipoLabel = document.getElementById('equipoLabel');
    if (temporada === '2025-26') {
      equipoSelect.style.display = 'block';
      equipoLabel.style.display = 'block';
      equipoSelect.value = currentTeam;
    } else {
      equipoSelect.style.display = 'none';
      equipoLabel.style.display = 'none';
    }

    renderPlayers();
    renderEntrenadores();
    renderVendidos();
    setupPlayButtons();
    setupEasterEgg();
  } catch (err) {
    console.error('Error cargando datos:', err);
  }
}

function renderPlayers() {
  const posList = [
    { pos: 'POR', containerId: 'porterosContainer' },
    { pos: 'DEF', containerId: 'defensasContainer' },
    { pos: 'MED', containerId: 'centrocampistasContainer' },
    { pos: 'DEL', containerId: 'delanterosContainer' }
  ];

  const temporadaSelect = document.getElementById('seasonSelect');
  const temporadaCarpeta = temporadaSelect && temporadaSelect.value ? temporadaSelect.value : '2025-26';
  const is202526 = temporadaSelect && temporadaSelect.value === '2025-26';
  const isSanse = currentTeam === 'sanse';
  const isF = currentTeam === 'f';

  let playersToRender = jugadores;
  let imgFolder = temporadaCarpeta;

  if (isSanse) {
    playersToRender = sanseJugadores;
  } else if (isF) {
    playersToRender = fJugadores;
    imgFolder = 'f_2025-26';
  }

  posList.forEach(({ pos, containerId }) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    playersToRender.forEach((player, idx) => {
      if (player.pos !== pos) return;
      const card = document.createElement('div');
      card.className = 'player-card';

      const dorsalDisplay = isSanse && player.dorsal2 ? player.dorsal2 : player.dorsal;
      const isCapitan = player.kapitaina === 1 && (isSanse || player.tipo === 'jugador');

      card.innerHTML = `
        <img class="player-img" src="${IMG_BASE_URL}${imgFolder}/${player.url_name}.jpg" alt="${player.name}" data-easter-egg="${player.url_name}">
        <div class="player-info">
          <span class="player-name player-name-clickable" data-player-id="${idx}" style="cursor: pointer;">
            ${buildFlagsHtml(player.pais)}
            ${player.name}${isCapitan ? ` <img src="${IMG_BASE_URL}other/kapitaina.png" alt="C" style="width:18px; height:18px; margin-left:4px; vertical-align:middle;">` : ''}
          </span>
          <span class="player-fullname">${player.fullname}</span>
          ${player.jaioData ? `<span class="player-birthdate">${formatBirthdateWithAge(player.jaioData)}</span>` : ''}
          <span class="player-dorsal">${dorsalDisplay ? t('plantilla.dorsal') + ': ' + dorsalDisplay : ''}</span>
        </div>
        ${is202526 && !isSanse && !isF ? `<div style="display: flex; flex-direction: column; align-items: center; position: absolute; right: 16px; top: 50px; gap: 6px;">
          <button class="play-btn" data-idx="${idx}">▶️</button>
          <div class="song-info-icon" tabindex="0">ⓘ<span class="song-info-tooltip"></span></div>
        </div>` : ''}
      `;

      const playerNameEl = card.querySelector('.player-name-clickable');
      playerNameEl.addEventListener('click', function(e) {
        e.stopPropagation();
        openPlayerModal(player);
      });

      const infoIcon = card.querySelector('.song-info-icon');
      if (infoIcon) {
        infoIcon.addEventListener('mouseenter', function() {
          const expl = player.cancion;
          if (expl && expl[window.currentLang]) {
            const tooltip = infoIcon.querySelector('.song-info-tooltip');
            tooltip.textContent = expl[window.currentLang];
            tooltip.style.display = 'block';
            
            // Ajustar posición si se sale de la pantalla
            setTimeout(() => {
              const rect = tooltip.getBoundingClientRect();
              let offsetX = 0;
              
              // Si se sale por la izquierda, desplazar a la derecha
              if (rect.left < 0) {
                offsetX = Math.abs(rect.left) + 8; // 8px de margen
              }
              // Si se sale por la derecha, desplazar a la izquierda
              else if (rect.right > window.innerWidth) {
                offsetX = -(rect.right - window.innerWidth + 8); // 8px de margen
              }
              
              if (offsetX !== 0) {
                tooltip.style.transform = `translate(calc(-50% + ${offsetX}px), -100%)`;
              } else {
                tooltip.style.transform = 'translate(-50%, -100%)';
              }
            }, 0);
          }
        });
        infoIcon.addEventListener('mouseleave', function() {
          const tooltip = infoIcon.querySelector('.song-info-tooltip');
          tooltip.style.display = 'none';
          // Resetear estilos inline para próximo uso
          tooltip.style.transform = '';
        });
      }
      container.appendChild(card);
    });
  });
}

function renderEntrenadores() {
  const container = document.getElementById('entrenadoresContainer');
  container.innerHTML = '';

  const temporadaSelect = document.getElementById('seasonSelect');
  const temporadaCarpeta = temporadaSelect && temporadaSelect.value ? temporadaSelect.value : '2025-26';
  const is202526 = temporadaSelect && temporadaSelect.value === '2025-26';
  const isSanse = currentTeam === 'sanse';
  const isF = currentTeam === 'f';

  let entrenadoresRender = entrenadores;
  let imgFolder = temporadaCarpeta;

  if (isSanse) {
    entrenadoresRender = sanseEntrenadores;
  } else if (isF) {
    entrenadoresRender = fEntrenadores;
    imgFolder = 'f_2025-26';
  }

  entrenadoresRender.forEach((coach, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card';

    const rol = coach.rol[window.currentLang];

    card.innerHTML = `
      <img class="player-img" src="${IMG_BASE_URL}${imgFolder}/${coach.url_name}.jpg" alt="${coach.name}" data-easter-egg="${coach.url_name}">
      <div class="player-info">
        <span class="player-name player-name-clickable" data-coach-id="${idx}" style="cursor: pointer;">
          ${buildFlagsHtml(coach.pais)}
          ${coach.name}
        </span>
        <span class="player-fullname">${coach.fullname}</span>
        ${coach.jaioData ? `<span class="player-birthdate">${formatBirthdateWithAge(coach.jaioData)}</span>` : ''}
        <span class="player-dorsal">${rol}</span>
      </div>
      ${is202526 && !isSanse && !isF ? `<div style="display: flex; flex-direction: column; align-items: center; position: absolute; right: 16px; top: 50px; gap: 6px;">
        <button class="play-btn" data-idx="e${idx}">▶️</button>
        <div class="song-info-icon" tabindex="0">ⓘ<span class="song-info-tooltip"></span></div>
      </div>` : ''}
    `;

    const coachNameEl = card.querySelector('.player-name-clickable');
    coachNameEl.addEventListener('click', function(e) {
      e.stopPropagation();
      openPlayerModal(coach, true);
    });

    const infoIcon = card.querySelector('.song-info-icon');
    if (infoIcon) {
      infoIcon.addEventListener('mouseenter', function() {
        const expl = coach.cancion;
        if (expl && expl[window.currentLang]) {
          const tooltip = infoIcon.querySelector('.song-info-tooltip');
          tooltip.textContent = expl[window.currentLang];
          tooltip.style.display = 'block';
          
          // Ajustar posición si se sale de la pantalla
          setTimeout(() => {
            const rect = tooltip.getBoundingClientRect();
            let offsetX = 0;
            
            // Si se sale por la izquierda, desplazar a la derecha
            if (rect.left < 0) {
              offsetX = Math.abs(rect.left) + 8; // 8px de margen
            }
            // Si se sale por la derecha, desplazar a la izquierda
            else if (rect.right > window.innerWidth) {
              offsetX = -(rect.right - window.innerWidth + 8); // 8px de margen
            }
            
            if (offsetX !== 0) {
              tooltip.style.transform = `translate(calc(-50% + ${offsetX}px), -100%)`;
            } else {
              tooltip.style.transform = 'translate(-50%, -100%)';
            }
          }, 0);
        }
      });
      infoIcon.addEventListener('mouseleave', function() {
        const tooltip = infoIcon.querySelector('.song-info-tooltip');
        tooltip.style.display = 'none';
        // Resetear estilos inline para próximo uso
        tooltip.style.transform = '';
      });
    }
    container.appendChild(card);
  });
}

function renderVendidos() {
  const container = document.getElementById('vendidosContainer');
  const title = document.getElementById('vendidosTitle');

  const temporadaSelect = document.getElementById('seasonSelect');
  const temporadaCarpeta = temporadaSelect && temporadaSelect.value ? temporadaSelect.value : '2025-26';
  const is202526 = temporadaSelect && temporadaSelect.value === '2025-26';
  const isSanse = currentTeam === 'sanse';
  const isF = currentTeam === 'f';

  container.innerHTML = '';
  let salidasToRender = [];
  let imgFolder = temporadaCarpeta;

  if (isSanse) {
    salidasToRender = sanseSalidas;
  } else if (isF) {
    salidasToRender = fSalidas;
    imgFolder = 'f_2025-26';
  } else {
    salidasToRender = salidas;
  }

  if (salidasToRender.length === 0) {
    container.style.display = 'none';
    title.style.display = 'none';
    return;
  }

  container.style.display = 'grid';
  title.style.display = 'block';
  title.textContent = t('plantilla.vendidosTitle');

  salidasToRender.forEach((player, idx) => {
    const card = document.createElement('div');
    card.className = 'player-card';
    const showControls = is202526 && !isF && !isSanse;
    const isCapitan = player.kapitaina === 1;

    card.innerHTML = `
      <img class="player-img" src="${IMG_BASE_URL}${imgFolder}/${player.url_name}.jpg" alt="${player.name}" data-easter-egg="${player.url_name}">
      <div class="player-info">
        <span class="player-name player-name-clickable" data-player-id="${idx}" style="cursor: pointer;">
          ${buildFlagsHtml(player.pais)}
          ${player.name}${isCapitan ? ` <img src="${IMG_BASE_URL}other/kapitaina.png" alt="C" style="width:18px; height:18px; margin-left:4px; vertical-align:middle;">` : ''}
        </span>
        <span class="player-fullname">${player.fullname}</span>
        ${player.jaioData ? `<span class="player-birthdate">${formatBirthdateWithAge(player.jaioData)}</span>` : ''}
        <span class="player-dorsal">${player.status[window.currentLang]}</span>
      </div>
      ${showControls ? `<div style="display: flex; flex-direction: column; align-items: center; position: absolute; right: 16px; top: 50px; gap: 6px;">
        <button class="play-btn" data-idx="v${idx}">▶️</button>
        <div class="song-info-icon" tabindex="0">ⓘ<span class="song-info-tooltip"></span></div>
      </div>` : ''}
    `;

    const playerNameEl = card.querySelector('.player-name-clickable');
    playerNameEl.addEventListener('click', function(e) {
      e.stopPropagation();
      openPlayerModal(player);
    });

    const infoIcon = card.querySelector('.song-info-icon');
    if (infoIcon) {
      infoIcon.addEventListener('mouseenter', function() {
        const expl = player.cancion;
        if (expl && expl[window.currentLang]) {
          const tooltip = infoIcon.querySelector('.song-info-tooltip');
          tooltip.textContent = expl[window.currentLang];
          tooltip.style.display = 'block';
          
          // Ajustar posición si se sale de la pantalla
          setTimeout(() => {
            const rect = tooltip.getBoundingClientRect();
            let offsetX = 0;
            
            // Si se sale por la izquierda, desplazar a la derecha
            if (rect.left < 0) {
              offsetX = Math.abs(rect.left) + 8; // 8px de margen
            }
            // Si se sale por la derecha, desplazar a la izquierda
            else if (rect.right > window.innerWidth) {
              offsetX = -(rect.right - window.innerWidth + 8); // 8px de margen
            }
            
            if (offsetX !== 0) {
              tooltip.style.transform = `translate(calc(-50% + ${offsetX}px), -100%)`;
            } else {
              tooltip.style.transform = 'translate(-50%, -100%)';
            }
          }, 0);
        }
      });
      infoIcon.addEventListener('mouseleave', function() {
        const tooltip = infoIcon.querySelector('.song-info-tooltip');
        tooltip.style.display = 'none';
        // Resetear estilos inline para próximo uso
        tooltip.style.transform = '';
      });
    }
    container.appendChild(card);
  });
}

function getSongUrl(player) {
  if (!player.url_name) return null;
  return `${AUDIO_BASE_URL}${player.url_name}.mp3`;
}

function setupEasterEgg() {
  EASTER_EGG_USERS.forEach(username => {
    document.querySelectorAll(`[data-easter-egg="${username}"]`).forEach(img => {
      img.style.cursor = 'pointer';
      img.onclick = function(e) {
        e.stopPropagation();
        playSecretAudio(username);
      };
    });
  });
}

function playSecretAudio(username) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onpause = null;
    currentAudio.onended = null;
    if (currentBtn) {
      currentBtn.textContent = '▶️';
      currentBtn = null;
    }
  }
  currentAudio = new Audio(`${AUDIO_BASE_URL}${username}_secret.mp3`);
  currentBtn = null;
  currentAudio.play();
  currentAudio.onended = function() {
    currentAudio = null;
    currentBtn = null;
  };
  currentAudio.onpause = function() {
    currentAudio = null;
    currentBtn = null;
  };
}

function setupPlayButtons() {
  document.querySelectorAll('.play-btn').forEach(btn => {
    btn.onclick = function() {
      let idx = btn.getAttribute('data-idx');
      let player, isVendido = false, isEntrenador = false;

      let playersToUse = currentTeam === 'sanse' ? sanseJugadores : (currentTeam === 'f' ? fJugadores : jugadores);
      let entrenadoresUse = currentTeam === 'sanse' ? sanseEntrenadores : (currentTeam === 'f' ? fEntrenadores : entrenadores);
      let salidasUse = currentTeam === 'f' ? fSalidas : salidas;

      if (idx.startsWith('v')) {
        player = salidasUse[parseInt(idx.slice(1))];
        isVendido = true;
      } else if (idx.startsWith('e')) {
        player = entrenadoresUse[parseInt(idx.slice(1))];
        isEntrenador = true;
      } else {
        player = playersToUse[parseInt(idx)];
      }

      let url = getSongUrl(player);
      if (!url) return;

      if (currentAudio && currentAudio.src === url) {
        if (currentAudio.paused) {
          currentAudio.play();
          btn.textContent = '⏹️';
        } else {
          currentAudio.pause();
          btn.textContent = '▶️';
        }
        return;
      }

      if (currentAudio) {
        currentAudio.pause();
        currentAudio.onpause = null;
        currentAudio.onended = null;
        if (currentBtn) currentBtn.textContent = '▶️';
      }

      if (!audioPositions[url]) audioPositions[url] = 0;
      currentAudio = new Audio(url);
      currentAudio.currentTime = audioPositions[url];
      currentBtn = btn;
      btn.textContent = '⏹️';
      currentAudio.play();
      currentAudio.onended = function() {
        btn.textContent = '▶️';
        audioPositions[url] = 0;
        currentAudio = null;
        currentBtn = null;
      };
      currentAudio.onpause = function() {
        audioPositions[url] = currentAudio.currentTime;
        btn.textContent = '▶️';
      };
    };
  });
}

function updateLangBtn() {
  document.getElementById('menu-once').textContent = t('menu.once');
  document.getElementById('menu-plantilla').textContent = t('menu.plantilla');
  document.getElementById('menu-merkatu').textContent = t('menu.merkatu');
  document.getElementById('plantillaTitle').textContent = t('plantilla.title');
  document.getElementById('vendidosTitle').textContent = t('plantilla.vendidosTitle');
  document.getElementById('porterosTitle').textContent = t('plantilla.porterosTitle');
  document.getElementById('defensasTitle').textContent = t('plantilla.defensasTitle');
  document.getElementById('centrocampistasTitle').textContent = t('plantilla.centrocampistasTitle');
  document.getElementById('delanterosTitle').textContent = t('plantilla.delanterosTitle');
  document.getElementById('entrenadoresTitle').textContent = t('plantilla.entrenadoresTitle');
  document.getElementById('langBtn').textContent = window.currentLang === 'es' ? 'Eus' : 'Cast';

  if (document.getElementById('seasonLabel')) {
    document.getElementById('seasonLabel').textContent = t('plantilla.season');
  }

  if (document.getElementById('equipoLabel')) {
    document.getElementById('equipoLabel').textContent = t('plantilla.team');
  }

  renderPlayers();
  renderEntrenadores();
  renderVendidos();
  setupPlayButtons();
  setupEasterEgg();
}

// Modal para información extendida del jugador
function openPlayerModal(player, isCoach = false) {
  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'player-modal-overlay';
  modal.id = 'playerModal';
  
  // Forzar estilos inline para asegurar que se muestre
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  // Calcular edad
  let age = '';
  if (player.jaioData) {
    const fechaFormato = player.jaioData.replace(/\//g, '-');
    const [year, month, day] = fechaFormato.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let playerAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      playerAge--;
    }
    age = playerAge;
  }

  // Obtener posición en español/euskera
  let posicionText = player.pos;
  const posicionesMap = {
    'POR': { 'es': 'Portero', 'eu': 'Atezaina' },
    'DEF': { 'es': 'Defensa', 'eu': 'Atzealaria' },
    'MED': { 'es': 'Centrocampista', 'eu': 'Erdilaria' },
    'DEL': { 'es': 'Delantero', 'eu': 'Aurrelaria' }
  };
  if (posicionesMap[player.pos]) {
    posicionText = posicionesMap[player.pos][window.currentLang];
  }

  // Construir banderas
  let banderas = '';
  if (Array.isArray(player.pais)) {
    banderas = player.pais.map(pais => 
      `<img src="${IMG_BASE_URL}banderak/${pais}.png" alt="${pais}" style="height:24px; border-radius:2px; box-shadow:0 1px 2px rgba(0,0,0,0.10); display: inline-block; margin-right: 4px;">`
    ).join('');
  }

  // Obtener valor de zubieta traducido
  let zubietaText = '';
  if (player.zubieta !== undefined && player.zubieta !== null && player.zubieta !== '') {
    if (player.zubieta === 1) {
      zubietaText = t('plantilla.zubieta_si');
    } else if (player.zubieta === 0.5) {
      zubietaText = t('plantilla.zubieta_pasado');
    } else if (player.zubieta === 0) {
      zubietaText = t('plantilla.zubieta_no');
    }
  }

  // Obtener canción si existe (no mostrar en Sanse)
  let cancionExpl = '';
  if (currentTeam !== 'sanse') {
    if (player.cancion && player.cancion[window.currentLang]) {
      cancionExpl = player.cancion[window.currentLang];
    } else if (!isCoach && player.cancion && player.cancion.es) {
      cancionExpl = player.cancion.es;
    }
  }

  // Determinar carpeta de imágenes
  let imgFolder = '2025-26';
  const temporadaSelect = document.getElementById('seasonSelect');
  if (temporadaSelect) {
    const temporada = temporadaSelect.value;
    if (temporada === '2024-25') {
      imgFolder = '2024-25';
    } else if (temporada === '2023-24') {
      imgFolder = '2023-24';
    } else if (temporada === '2025-26' && currentTeam === 'f') {
      imgFolder = 'f_2025-26';
    }
  }

  // Determinar qué dorsal mostrar (usar dorsal2 cuando estamos en Sanse)
  const dorsalToShow = (currentTeam === 'sanse' && player.dorsal2) ? player.dorsal2 : player.dorsal;

  modal.innerHTML = `
    <div class="player-modal" style="background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative; padding: 20px;">
      <button class="modal-close-btn" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 2em; cursor: pointer; color: #0077cc; padding: 0; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background-color 0.2s;">&times;</button>
      <div class="modal-content-wrapper" style="display: flex; gap: 24px; align-items: center;">
        <div class="modal-image-section" style="display: flex; flex-direction: column; align-items: center; gap: 12px; flex-shrink: 0;">
          <img src="${IMG_BASE_URL}${imgFolder}/${player.url_name}.jpg" alt="${player.name}" class="modal-player-img" style="width: 180px; height: 180px; border-radius: 12px; object-fit: cover; border: 3px solid #0077cc; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
          ${cancionExpl ? `
          <div class="modal-song-bubble" style="background: #f0f8ff; border: 2px solid #0077cc; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; max-width: 280px;">
            <button class="modal-play-btn" style="background: none; border: none; font-size: 1.4em; cursor: pointer; padding: 0; margin: 0; flex-shrink: 0;">▶️</button>
            <span style="color: #333; font-size: 0.9em; line-height: 1.4;">${cancionExpl}</span>
          </div>
          ` : ''}
        </div>
        <div class="modal-info-section" style="flex: 1; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <h2 style="color: #003366; font-size: 1.8em; font-weight: bold; margin: 0;">${player.name}</h2>
            ${player.kapitaina === 1 && (player.tipo.includes('salida') || player.tipo === 'jugador' || currentTeam === 'sanse') ? `<img src="${IMG_BASE_URL}other/kapitaina.png" alt="C" style="width:32px; height:32px; vertical-align:middle;">` : ''}
          </div>
          <div class="modal-divider" style="height: 2px; background: #0077cc; margin-bottom: 16px;"></div>
          
          ${player.fullname ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalNombreCompleto')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${player.fullname}</span>
          </div>
          ` : ''}
          ${!player.rol ? `
          ${player.pos ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalPosicion')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${posicionText}</span>
          </div>
          ` : ''}

          ${dorsalToShow ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalDorsal')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${dorsalToShow}</span>
          </div>
          ` : ''}
          ` : `
          ${player.rol ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalPuesto')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${player.rol[window.currentLang]}</span>
          </div>
          ` : ''}
          `}

          ${player.jaioData ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalFechaNacimiento')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${player.jaioData}</span>
          </div>

          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalEdad')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${age} ${t('plantilla.anos')}</span>
          </div>
          ` : ''}

          ${player.pais ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalNacionalidad')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${banderas}</span>
          </div>
          ` : ''}

          ${zubietaText ? `
          <div class="modal-info-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: none;">
            <span class="modal-label" style="font-weight: bold; color: #003366; min-width: 140px; font-size: 0.9em;">${t('plantilla.modalCanterano')}:</span>
            <span class="modal-value" style="color: #555; text-align: right; flex: 1; padding-left: 12px; font-size: 0.95em;">${zubietaText}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Agregar funcionalidad al botón de play del modal
  const playBtn = modal.querySelector('.modal-play-btn');
  if (playBtn && player.url_name) {
    playBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const songUrl = getSongUrl(player);
      if (songUrl) {
        // Si ya hay audio reproduciéndose
        if (currentAudio && currentBtn === playBtn) {
          // Toggle: si está playing, pausar
          if (currentAudio.paused) {
            currentAudio.play();
            playBtn.textContent = '⏸️';
          } else {
            currentAudio.pause();
            playBtn.textContent = '▶️';
          }
        } else {
          // Reproducir nuevo audio
          if (currentAudio) {
            currentAudio.pause();
            if (currentBtn) {
              currentBtn.textContent = '▶️';
            }
          }
          currentAudio = new Audio(songUrl);
          currentAudio.play();
          playBtn.textContent = '⏸️';
          currentBtn = playBtn;
        }
      }
    });
  }

  // Cerrar modal
  const closeBtn = modal.querySelector('.modal-close-btn');
  closeBtn.addEventListener('click', function() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (currentBtn) {
      currentBtn.textContent = '▶️';
      currentBtn = null;
    }
    modal.remove();
  });

  const overlay = modal.querySelector('.player-modal-overlay') || modal;
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      if (currentBtn) {
        currentBtn.textContent = '▶️';
        currentBtn = null;
      }
      modal.remove();
    }
  });

  // Agregar animación de entrada
  modal.style.animation = 'fadeIn 0.3s ease-in-out';
}

// Initialize
async function initPlantilla() {
  // Esperar a que i18next esté listo
  await initializeI18n();

  const temporadaSelect = document.getElementById('seasonSelect');
  const equipoSelect = document.getElementById('equipoSelect');

  if (temporadaSelect) {
    temporadaSelect.addEventListener('change', function() {
      currentTeam = 'real';
      if (equipoSelect) equipoSelect.value = 'real';
      cargarDatosTemporada(this.value);
    });
    cargarDatosTemporada(temporadaSelect.value);
  } else {
    cargarDatosTemporada('2025-26');
  }

  if (equipoSelect) {
    equipoSelect.addEventListener('change', function() {
      currentTeam = this.value;
      localStorage.setItem('team', currentTeam);
      renderPlayers();
      renderEntrenadores();
      renderVendidos();
      setupPlayButtons();
      setupEasterEgg();
    });
  }

  document.getElementById('langBtn').onclick = function() {
    const newLang = window.currentLang === 'es' ? 'eu' : 'es';
    changeLanguage(newLang);
    updateLangBtn();
  };

  // Escuchar cambios de idioma desde otras páginas
  window.addEventListener('languageChanged', function(e) {
    updateLangBtn();
  });

  updateLangBtn();
}

document.addEventListener('DOMContentLoaded', initPlantilla);
