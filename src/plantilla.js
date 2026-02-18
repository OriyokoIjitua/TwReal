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

      card.innerHTML = `
        <img class="player-img" src="${IMG_BASE_URL}${imgFolder}/${player.url_name}.jpg" alt="${player.name}" data-easter-egg="${player.url_name}">
        <div class="player-info">
          <span class="player-name">
            <img src="${IMG_BASE_URL}banderak/${player.pais}.png" alt="flag" style="${getFlagStyle(player.pais)} margin-right:1px;">
            ${player.pais2 ? `<img src="${IMG_BASE_URL}banderak/${player.pais2}.png" alt="flag2" style="${getFlagStyle(player.pais2)} margin-left:1px;">` : ''}
            ${player.pais3 ? `<img src="${IMG_BASE_URL}banderak/${player.pais3}.png" alt="flag3" style="${getFlagStyle(player.pais3)} margin-left:1px;">` : ''}
            ${player.pais4 ? `<img src="${IMG_BASE_URL}banderak/${player.pais4}.png" alt="flag4" style="${getFlagStyle(player.pais4)} margin-left:1px;">` : ''}
            ${player.name}
          </span>
          <span class="player-fullname">${player.fullname}</span>
          ${player.jaioData ? `<span class="player-birthdate">${player.jaioData}</span>` : ''}
          <span class="player-dorsal">${dorsalDisplay ? t('plantilla.dorsal') + ': ' + dorsalDisplay : ''}</span>
        </div>
        ${is202526 && !isSanse && !isF ? `<div style="display: flex; flex-direction: column; align-items: center; position: absolute; right: 16px; top: 50px; gap: 6px;">
          <button class="play-btn" data-idx="${idx}">▶️</button>
          <div class="song-info-icon" tabindex="0">ⓘ<span class="song-info-tooltip"></span></div>
        </div>` : ''}
      `;

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
        <span class="player-name">
          <img src="${IMG_BASE_URL}banderak/${coach.pais}.png" alt="flag" style="${getFlagStyle(coach.pais)} margin-right:1px;">
          ${coach.pais2 ? `<img src="${IMG_BASE_URL}banderak/${coach.pais2}.png" alt="flag2" style="${getFlagStyle(coach.pais2)} margin-left:1px;">` : ''}
          ${coach.pais3 ? `<img src="${IMG_BASE_URL}banderak/${coach.pais3}.png" alt="flag3" style="${getFlagStyle(coach.pais3)} margin-left:1px;">` : ''}
          ${coach.pais4 ? `<img src="${IMG_BASE_URL}banderak/${coach.pais4}.png" alt="flag4" style="${getFlagStyle(coach.pais4)} margin-left:1px;">` : ''}
          ${coach.name}
        </span>
        <span class="player-fullname">${coach.fullname}</span>
        <span class="player-dorsal">${rol}</span>
      </div>
      ${is202526 && !isSanse && !isF ? `<div style="display: flex; flex-direction: column; align-items: center; position: absolute; right: 16px; top: 50px; gap: 6px;">
        <button class="play-btn" data-idx="e${idx}">▶️</button>
        <div class="song-info-icon" tabindex="0">ⓘ<span class="song-info-tooltip"></span></div>
      </div>` : ''}
    `;

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

    card.innerHTML = `
      <img class="player-img" src="${IMG_BASE_URL}${imgFolder}/${player.url_name}.jpg" alt="${player.name}" data-easter-egg="${player.url_name}">
      <div class="player-info">
        <span class="player-name">
          <img src="${IMG_BASE_URL}banderak/${player.pais}.png" alt="flag" style="${getFlagStyle(player.pais)} margin-right:1px;">
          ${player.pais2 ? `<img src="${IMG_BASE_URL}banderak/${player.pais2}.png" alt="flag2" style="${getFlagStyle(player.pais2)} margin-left:1px;">` : ''}
          ${player.pais3 ? `<img src="${IMG_BASE_URL}banderak/${player.pais3}.png" alt="flag3" style="${getFlagStyle(player.pais3)} margin-left:1px;">` : ''}
          ${player.pais4 ? `<img src="${IMG_BASE_URL}banderak/${player.pais4}.png" alt="flag4" style="${getFlagStyle(player.pais4)} margin-left:1px;">` : ''}
          ${player.name}
        </span>
        <span class="player-fullname">${player.fullname}</span>
        ${player.jaioData ? `<span class="player-birthdate">${player.jaioData}</span>` : ''}
        <span class="player-dorsal">${player.status[window.currentLang]}</span>
      </div>
      ${showControls ? `<div style="display: flex; flex-direction: column; align-items: center; position: absolute; right: 16px; top: 50px; gap: 6px;">
        <button class="play-btn" data-idx="v${idx}">▶️</button>
        <div class="song-info-icon" tabindex="0">ⓘ<span class="song-info-tooltip"></span></div>
      </div>` : ''}
    `;

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
