    // Centraliza la actualización de textos UI y menú
    function updateUI() {
      // Textos principales
      document.getElementById('filterText').textContent = t('hamaikakoa.filter');
      document.getElementById('downloadBtn').textContent = t('hamaikakoa.descargar');
      document.getElementById('clearBtn').textContent = t('hamaikakoa.limpiar');
      const modalTitle = document.querySelector('.player-list-box h3');
      if (modalTitle) modalTitle.textContent = t('hamaikakoa.seleccionaJugador');
      const closeBtn = document.querySelector('.close-modal-btn');
      if (closeBtn) closeBtn.textContent = t('hamaikakoa.cerrar');
      document.getElementById('watermarkText').textContent = t('hamaikakoa.watermark');
      document.getElementById('formationText').textContent = t('hamaikakoa.formacion');
      // Menú lateral
      document.getElementById('menu-once').textContent = t('menu.once');
      document.getElementById('menu-plantilla').textContent = t('menu.plantilla');
      document.getElementById('menu-merkatu').textContent = t('menu.merkatu');
      const btn = document.getElementById('langBtn');
      if (btn) btn.textContent = window.currentLang === 'es' ? 'Eus' : 'Cast';
      // Móvil
      if (document.getElementById('filterLabelMobile'))
        document.getElementById('filterLabelMobile').childNodes[2].textContent = t('hamaikakoa.filter');
      if (document.getElementById('watermarkLabelMobile'))
        document.getElementById('watermarkLabelMobile').childNodes[2].textContent = t('hamaikakoa.watermark');
      if (document.getElementById('formationTextMobile'))
        document.getElementById('formationTextMobile').textContent = t('hamaikakoa.formacion');
    }

    // Botón de idioma: alterna currentLang y guarda en localStorage
    document.getElementById('langBtn').onclick = function() {
      const newLang = window.currentLang === 'es' ? 'eu' : 'es';
      changeLanguage(newLang);
      updateUI();
    };
    
    // INICIALIZAR TODO DESPUÉS DE QUE I18NEXT ESTÉ LISTO
    async function initHamaikakoa() {
      await initializeI18n();
      
      // Inicializar UI
      updateUI();
    // Lista de jugadores: se leerá exactamente igual que en `plantilla.html`
    let players = [];
    const IMG_ROOT = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/';

    const getPlaceholderImage = (position, temporada) => {
      if (position === 'POR') {
        return `${IMG_ROOT}${temporada}/def_port.jpg`;
      } else {
        return `${IMG_ROOT}${temporada}/def_jug.jpg`;
      }
    };

    // Cargar datos por temporada desde el JSON en raw.githubusercontent (igual que plantilla.html)
    async function cargarDatosTemporada(temporada) {
      try {
        const data = await fetch(`https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/json/plantilla_${temporada}.json`).then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        });
        const jugadoresData = data.filter(ind => ind.tipo === 'jugador' || ind.tipo === 'dual' || ind.tipo === 'dual-ber-bi');
        players = jugadoresData.map(p => ({
          dorsal: p.dorsal,
          name: p.name,
          pos: p.pos,
          img: IMG_ROOT + temporada + '/' + (p.url_name || '').trim() + '.jpg',
          placeholder: getPlaceholderImage(p.pos, temporada),
          positions: Array.isArray(p.positions) ? p.positions : (p.positions ? [p.positions] : [] )
        }));
        if (window.renderPositions) window.renderPositions();
      } catch (err) {
        console.error('Error cargando plantilla_' + temporada + '.json:', err);
        showLoadError('No se ha podido cargar el JSON de plantilla para la temporada ' + temporada + '. Comprueba la conexión o sirve los archivos vía HTTP.');
      }
    }

    // Cargar la temporada por defecto (igual que plantilla.html)
    cargarDatosTemporada('2025-26');

    // Definición de formaciones
    const formations = {
      '4-2-3-1': [
        { x: 60, y: 100, role: 'EI' }, // Extremo Izq
        { x: 260, y: 20, role: 'DC' }, // Delantero Centro
        { x: 460, y: 100, role: 'ED' }, // Extremo Der
        { x: 260, y: 190, role: 'MCO' }, // Mediopunta
        { x: 160, y: 310, role: 'MCD' }, // Pivote izq
        { x: 360, y: 310, role: 'MCD' }, // Pivote der
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 420, role: 'LI' }, // Lateral Izq
        { x: 485, y: 420, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '4-3-3': [
        { x: 60, y: 60, role: 'EI' }, // Extremo Izq
        { x: 260, y: 20, role: 'DC' }, // Delantero Centro
        { x: 460, y: 60, role: 'ED' }, // Extremo Der
        { x: 360, y: 190, role: 'MCO' }, // Mediopunta der
        { x: 160, y: 210, role: 'MC' }, // Mediocentro izq
        { x: 260, y: 310, role: 'MCD' }, // Pivote
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 420, role: 'LI' }, // Lateral Izq
        { x: 485, y: 420, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '4-4-2 (1)': [
        { x: 160, y: 40, role: 'DDC' }, // Delantero Izq
        { x: 360, y: 40, role: 'DDC' }, // Delantero Der
        { x: 420, y: 190, role: 'MCO' }, // Mediopunta der
        { x: 100, y: 190, role: 'MC' }, // Mediocentro izq
        { x: 190, y: 310, role: 'MCD' }, // Pivote izq
        { x: 330, y: 310, role: 'MCD' }, // Pivote der
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 420, role: 'LI' }, // Lateral Izq
        { x: 485, y: 420, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '4-4-2 (2)': [
        { x: 160, y: 40, role: 'DDC' }, // Delantero Izq
        { x: 360, y: 40, role: 'DDC' }, // Delantero Der
        { x: 260, y: 160, role: 'MCO' }, // Mediopunta
        { x: 100, y: 220, role: 'MC' }, // MC izq
        { x: 420, y: 220, role: 'MC' }, // MC der
        { x: 260, y: 320, role: 'MCD' }, // Pivote
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 420, role: 'LI' }, // Lateral Izq
        { x: 485, y: 420, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '3-4-1-2': [
        { x: 160, y: 30, role: 'DDC' }, // Delantero Izq
        { x: 360, y: 30, role: 'DDC' }, // Delantero Der
        { x: 260, y: 150, role: 'MCO' }, // Mediopunta
        { x: 160, y: 270, role: 'MC' }, // Mediocentro
        { x: 360, y: 280, role: 'MCD' }, // Pivote
        { x: 260, y: 440, role: 'DFC' }, // Central
        { x: 120, y: 490, role: 'DFC' }, // Central Izq
        { x: 400, y: 490, role: 'DFC' }, // Central Der
        { x: 35, y: 360, role: 'CAI' }, // Carrilero Izq
        { x: 485, y: 360, role: 'CAD' }, // Carrilero Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '5-3-2': [
        { x: 160, y: 40, role: 'DDC' }, // Delantero Izq
        { x: 360, y: 40, role: 'DDC' }, // Delantero Der
        { x: 380, y: 180, role: 'MCO' }, // Mediopunta der
        { x: 140, y: 200, role: 'MC' }, // Mediocentro izq
        { x: 260, y: 300, role: 'MCD' }, // Pivote
        { x: 260, y: 440, role: 'DFC' }, // Central
        { x: 120, y: 490, role: 'DFC' }, // Central Izq
        { x: 400, y: 490, role: 'DFC' }, // Central Der
        { x: 35, y: 360, role: 'CAI' }, // Carrilero Izq
        { x: 485, y: 360, role: 'CAD' }, // Carrilero Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '5-2-3': [
        { x: 60, y: 120, role: 'EI' }, // Extremo Izq
        { x: 260, y: 20, role: 'DC' }, // Delantero Centro
        { x: 460, y: 120, role: 'ED' }, // Extremo Der
        { x: 360, y: 250, role: 'MC' }, // Mediocentro der
        { x: 160, y: 280, role: 'MCD' }, // Pivote izq
        { x: 260, y: 440, role: 'DFC' }, // Central
        { x: 120, y: 490, role: 'DFC' }, // Central Izq
        { x: 400, y: 490, role: 'DFC' }, // Central Der
        { x: 35, y: 360, role: 'CAI' }, // Carrilero Izq
        { x: 485, y: 360, role: 'CAD' }, // Carrilero Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '5-1-3-1': [
        { x: 60, y: 120, role: 'EI' }, // Extremo Izq
        { x: 260, y: 20, role: 'DC' }, // Delantero Centro
        { x: 460, y: 120, role: 'ED' }, // Extremo Der
        { x: 260, y: 170, role: 'MCO' }, // Mediapunta
        { x: 260, y: 310, role: 'MCD' }, // Pivote
        { x: 260, y: 440, role: 'DFC' }, // Central
        { x: 120, y: 490, role: 'DFC' }, // Central Izq
        { x: 400, y: 490, role: 'DFC' }, // Central Der
        { x: 35, y: 360, role: 'CAI' }, // Carrilero Izq
        { x: 485, y: 360, role: 'CAD' }, // Carrilero Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '4-5-1': [
        { x: 50, y: 140, role: 'MCO' }, // Centro izquierdo
        { x: 260, y: 20, role: 'DC' }, // Delantero Centro
        { x: 470, y: 140, role: 'MCO' }, // Centro derecho
        { x: 160, y: 240, role: 'MC' }, // Pivote izq
        { x: 360, y: 240, role: 'MC' }, // Pivote der
        { x: 260, y: 340, role: 'MCD' }, // Medio
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 400, role: 'LI' }, // Lateral Izq
        { x: 485, y: 400, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '4-2-1-2-1': [
        { x: 100, y: 150, role: 'MCO' }, // Centro izquierdo
        { x: 260, y: 20, role: 'DC' }, // Delantero Centro
        { x: 420, y: 150, role: 'MCO' }, // Centro derecho
        { x: 260, y: 190, role: 'MC' }, // Medio
        { x: 160, y: 310, role: 'MCD' }, // Pivote izq
        { x: 360, y: 310, role: 'MCD' }, // Pivote der
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 400, role: 'LI' }, // Lateral Izq
        { x: 485, y: 400, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ],
      '4-1-2-2-1': [
        { x: 160, y: 125, role: 'MCO' }, // Centro izquierdo
        { x: 260, y: 10, role: 'DC' }, // Delantero Centro
        { x: 360, y: 125, role: 'MCO' }, // Centro derecho
        { x: 110, y: 260, role: 'MC' }, // Pivote izq
        { x: 410, y: 260, role: 'MC' }, // Pivote der
        { x: 260, y: 340, role: 'MCD' }, // Medio
        { x: 180, y: 470, role: 'DFC' }, // Central Izq
        { x: 340, y: 470, role: 'DFC' }, // Central Der
        { x: 35, y: 400, role: 'LI' }, // Lateral Izq
        { x: 485, y: 400, role: 'LD' }, // Lateral Der
        { x: 260, y: 600, role: 'POR' }
      ]
    };

  // Inicializar formación según el selector
  let currentFormation = document.getElementById('formationSelect').value || '4-2-3-1';
  window.positions = formations[currentFormation];

    // Estado de jugadores asignados
    window.assigned = Array(window.positions.length).fill(null);
    
    // Referencias locales que apuntan a window para facilitar acceso
    let positions = window.positions;
    let assigned = window.assigned;

    // Cambiar formación y mantener jugadores
    document.getElementById('formationSelect').addEventListener('change', function() {
      const prevFormation = currentFormation;
      const newFormation = this.value;
      if (newFormation === prevFormation) return;
      // Mapear roles equivalentes
      const prevPositions = formations[prevFormation];
      const nextPositions = formations[newFormation];
      let newAssigned = Array(nextPositions.length).fill(null);

      newAssigned[0] = assigned[0];
      newAssigned[1] = assigned[1];
      newAssigned[2] = assigned[2];
      newAssigned[3] = assigned[3];
      newAssigned[4] = assigned[4];
      newAssigned[5] = assigned[5];
      newAssigned[6] = assigned[6];
      newAssigned[7] = assigned[7];
      newAssigned[8] = assigned[8];
      newAssigned[9] = assigned[9];
      newAssigned[10] = assigned[10];
  currentFormation = newFormation;
  positions = window.positions = formations[currentFormation];
  assigned = window.assigned = newAssigned;
  if (window.renderPositions) window.renderPositions();
    });

    window.renderPositions = function renderPositions() {
      const container = document.getElementById('positions');
      container.innerHTML = '';
      
      // Calcular factor de escala basado en el ancho real del contenedor
      const fieldContainer = document.querySelector('.field-container');
      const currentWidth = fieldContainer.offsetWidth;
      const scale = currentWidth / 650; // 650 es el ancho original del campo
      
      window.positions.forEach((pos, idx) => {
        const div = document.createElement('div');
        div.className = 'player-pos' + (window.assigned[idx] ? ' selected' : '');
        
        // Aplicar escala a las coordenadas
        const scaledX = pos.x * scale;
        const scaledY = pos.y * scale;
        const offset = window.assigned[idx] ? 0 : 10;
        
        div.style.left = (scaledX + (offset * scale)) + 'px';
        div.style.top = (scaledY + (offset * scale)) + 'px';
        
        // Escalar tamaño del círculo también
        const baseSize = window.assigned[idx] ? 130 : 110;
        const scaledSize = baseSize * scale;
        div.style.width = scaledSize + 'px';
        div.style.height = scaledSize + 'px';
        
        div.onclick = (e) => {
          e.stopPropagation();
          openPlayerList(idx);
        };
        // Menú contextual (click derecho)
        div.oncontextmenu = (e) => {
          e.preventDefault();
          if (!assigned[idx]) return;
          // Eliminar menú anterior si existe
          const oldMenu = document.getElementById('contextMenu');
          if (oldMenu) oldMenu.remove();
          // Crear menú
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
          // Traducciones
          const lang = localStorage.getItem('lang') || 'es';
          const opts = [
            { es: 'Quitar jugador', eu: 'Jokalaria kendu', action: () => { assigned = window.assigned; window.assigned[idx] = null; if (window.cambiosOnce) delete window.cambiosOnce[idx]; if (window.renderPositions) window.renderPositions(); } },
            { es: 'Jugador suplente', eu: 'Ordezko jokalaria', action: () => { window.cambioEnPosicion = idx; openCambioList(idx); } }
          ];
    // Lista de jugadores para cambio
    function openCambioList(idx) {
      const modal = document.getElementById('playerListModal');
      modal.style.display = 'flex';
      const list = document.getElementById('playerList');
      list.innerHTML = '';
      // Actualizar título y botón cerrar según idioma
      const modalTitle = document.querySelector('.player-list-box h3');
      if (modalTitle) {
        modalTitle.textContent = (window.currentLang === 'eu') ? 'Ordezkoa aukeratu' : 'Selecciona el cambio';
      }
      const closeBtn = document.querySelector('.close-modal-btn');
      if (closeBtn) closeBtn.textContent = (window.currentLang === 'eu') ? 'Itxi' : 'Cerrar';
      const filterActive = document.getElementById('filterByPosition').checked;
      const posRole = positions[idx].role;
      const cambios = window.cambiosOnce || {};
      if (!Array.isArray(cambios[idx])) cambios[idx] = [];
      players.forEach(player => {
        if (filterActive && (!player.positions || !player.positions.includes(posRole))) return;
        const item = document.createElement('div');
        item.className = 'player-list-item';
        // ¿Ya seleccionado como suplente en esta posición?
        const isSelected = cambios[idx].includes(player.name);
        item.style.background = isSelected ? '#e0f7fa' : '';
        item.onclick = () => {
          // Si ya está como suplente en esta posición, quitarlo
          if (isSelected) {
            cambios[idx] = cambios[idx].filter(n => n !== player.name);
          } else {
            // Verificar si está como titular
            const getId = p => p ? (p.dorsal ? p.dorsal : p.name) : null;
            const playerId = getId(player);
            const titularIdx = assigned.findIndex(p => getId(p) === playerId);
            if (titularIdx !== -1) {
              // Si hay suplentes en la posición original, el primero pasa a titular
              if (Array.isArray(cambios[titularIdx]) && cambios[titularIdx].length > 0) {
                const nuevoTitular = cambios[titularIdx][0];
                const nuevoPlayer = players.find(p => p.name === nuevoTitular);
                assigned[titularIdx] = nuevoPlayer;
                // Eliminar ese suplente de la lista
                cambios[titularIdx] = cambios[titularIdx].filter(n => n !== nuevoTitular);
              } else {
                assigned[titularIdx] = null;
              }
              // Añadir el titular como suplente en la nueva posición
              cambios[idx].push(player.name);
              // Eliminar de suplentes en todas las posiciones
              Object.keys(cambios).forEach(k => {
                if (k != idx.toString()) cambios[k] = cambios[k].filter(n => n !== player.name);
              });
            } else {
              // Verificar si está como suplente en otra posición
              let foundIdx = null;
              Object.keys(cambios).forEach(k => {
                if (cambios[k].includes(player.name)) foundIdx = k;
              });
              if (foundIdx !== null && foundIdx != idx) {
                // Swap entre suplentes
                cambios[foundIdx] = cambios[foundIdx].filter(n => n !== player.name);
                cambios[idx].push(player.name);
              } else {
                cambios[idx].push(player.name);
              }
            }
          }
          window.cambiosOnce = cambios;
          modal.style.display = 'none';
          assigned = window.assigned = assigned;
          if (window.renderPositions) window.renderPositions();
        };
        item.innerHTML =
          '<span class="player-list-dorsal" style="display:inline-block;min-width:22px;max-width:22px;text-align:right;">' + (player.dorsal ? player.dorsal : '&nbsp;') + '</span>' +
          '<img class="player-list-img" src="' + player.img + '" onerror="this.src=\'' + player.placeholder + '\'" />' +
          '<span class="player-list-name">' + player.name + '</span>';
        list.appendChild(item);
      });
    }
          opts.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = opt[lang];
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
          // Cerrar menú al hacer click fuera
          setTimeout(() => {
            document.addEventListener('click', function handler(ev) {
              if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', handler);
              }
            });
          }, 10);
        };
        if (assigned[idx]) {
          const scaledFontSize = 0.8 * scale; // Escalar el tamaño de fuente
          div.innerHTML = `
            <div style="position:relative;width:100%;height:100%;">
              <img class="player-img" src="${assigned[idx].img}" onerror="this.src='${assigned[idx].placeholder}'" title="${assigned[idx].name} (${assigned[idx].dorsal})" />
              <div class="dorsal-badge-onfield" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis; font-size:${scaledFontSize}em;">
          ${assigned[idx].dorsal ?? ''}. ${assigned[idx].name}
              </div>
            </div>`;
        } else {
          div.innerHTML = '<span class="plus-icon">+</span>';
        }
        container.appendChild(div);
        // Mostrar nombres de todos los suplentes en líneas separadas debajo del círculo
        const cambios = window.cambiosOnce || {};
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

    function openPlayerList(idx) {
      const modal = document.getElementById('playerListModal');
      modal.style.display = 'flex';
      const list = document.getElementById('playerList');
      list.innerHTML = '';
      // Actualizar título y botón cerrar según idioma
      const modalTitle = document.querySelector('.player-list-box h3');
      if (modalTitle) modalTitle.textContent = t('hamaikakoa.seleccionaJugador');
      const closeBtn = document.querySelector('.close-modal-btn');
      if (closeBtn) closeBtn.textContent = t('hamaikakoa.cerrar');
      const filterActive = document.getElementById('filterByPosition').checked;
      const posRole = positions[idx].role;
      players.forEach(player => {
        if (filterActive && (!player.positions || !player.positions.includes(posRole))) return;
        const item = document.createElement('div');
        item.className = 'player-list-item';
        item.onclick = () => {
          // Identificador único: dorsal si existe, si no, nombre
          const getId = p => p ? (p.dorsal ? p.dorsal : p.name) : null;
          const playerId = getId(player);
          const cambios = window.cambiosOnce || {};
          // Eliminar al jugador de suplentes en todas las posiciones
          Object.keys(cambios).forEach(k => {
            cambios[k] = cambios[k].filter(n => n !== player.name);
          });
          const currentIdx = assigned.findIndex(p => getId(p) === playerId);
          if (currentIdx !== -1 && currentIdx !== idx) {
            const temp = assigned[idx];
            assigned[idx] = player;
            assigned[currentIdx] = temp;
            // Si hay suplentes en la posición original, el primero pasa a titular
            if (Array.isArray(cambios[currentIdx]) && cambios[currentIdx].length > 0) {
              const nuevoTitular = cambios[currentIdx][0];
              const nuevoPlayer = players.find(p => p.name === nuevoTitular);
              assigned[currentIdx] = nuevoPlayer;
              // Eliminar ese suplente de la lista
              cambios[currentIdx] = cambios[currentIdx].filter(n => n !== nuevoTitular);
              window.cambiosOnce = cambios;
            }
            // Si el jugador seleccionado era suplente en la nueva posición, el titular anterior pasa a suplente
            if (Array.isArray(cambios[idx]) && !cambios[idx].includes(temp?.name) && temp) {
              cambios[idx].push(temp.name);
              window.cambiosOnce = cambios;
            }
          } else {
            // Si el jugador seleccionado era suplente en la nueva posición, el titular anterior pasa a suplente
            const temp = assigned[idx];
            assigned[idx] = player;
            if (Array.isArray(cambios[idx]) && !cambios[idx].includes(temp?.name) && temp) {
              cambios[idx].push(temp.name);
              window.cambiosOnce = cambios;
            }
          }
          window.cambiosOnce = cambios;
          modal.style.display = 'none';
          assigned = window.assigned = assigned;
          if (window.renderPositions) window.renderPositions();
        };
        item.innerHTML =
          '<span class="player-list-dorsal" style="display:inline-block;min-width:22px;max-width:22px;text-align:right;">' + (player.dorsal ? player.dorsal : '&nbsp;') + '</span>' +
          '<img class="player-list-img" src="' + player.img + '" onerror="this.src=\'' + player.placeholder + '\'" />' +
          '<span class="player-list-name">' + player.name + '</span>';
        list.appendChild(item);
      });
    // Actualizar lista de jugadores al cambiar el filtro
    document.getElementById('filterByPosition').addEventListener('change', () => {
      if (window.renderPositions) window.renderPositions();
    });
      // Cerrar modal al click fuera de la caja
      setTimeout(() => {
        modal.onclick = function(e) {
          if (e.target === modal) {
            modal.style.display = 'none';
          }
        };
      }, 50);
    }

    window.closePlayerList = function closePlayerList() {
      document.getElementById('playerListModal').style.display = 'none';
    };

    // Descargar alineación como imagen
    function setupButtons() {
      document.getElementById('downloadBtn').onclick = function() {
        const field = document.querySelector('.field-container');
        if (window.html2canvas) {
          window.html2canvas(field, {
        backgroundColor: null,
        useCORS: true,
        scale: 2 // Mejora la calidad duplicando la resolución
      }).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Hamaikakoa.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.98); // Calidad máxima
            link.click();
          });
        } else {
          alert('html2canvas no está cargado todavía. Espera unos segundos y vuelve a intentarlo.');
        }
      };
      document.getElementById('clearBtn').onclick = function() {
        assigned = window.assigned = Array(window.positions.length).fill(null);
        if (window.renderPositions) window.renderPositions();
      };
    }
    setupButtons();
    // Cargar html2canvas si no existe
    if (!window.html2canvas) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = setupButtons;
      document.body.appendChild(script);
    }

    // Al cargar, sincronizar selector y formación
    document.addEventListener('DOMContentLoaded', function() {
      // Si el selector tiene valor, usarlo
      currentFormation = document.getElementById('formationSelect').value || '4-2-3-1';
      positions = window.positions = formations[currentFormation];
      if (window.renderPositions) window.renderPositions();
    });
    document.getElementById('watermarkToggle').addEventListener('change', function() {
  const fieldImg = document.querySelector('.field-img');
  if (this.checked) {
    fieldImg.src = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/Zelaia.jpg';
  } else {
    fieldImg.src = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/Zelaia2.jpg';
  }
});
    // Duplicar el contenido de opciones para móvil
function renderMobileOptions() {
  const mobile = document.getElementById('optionsContainerMobile');
  if (!mobile) return; // No hacer nada si el elemento no existe
  mobile.innerHTML = `
    <div id="filterContainerMobileInner">
      <label id="formationLabelMobile" style="color:#fff; font-size:1.2em; font-weight:bold; display:block; margin-bottom:8px;">
        <span id="formationTextMobile">Formación:</span>
        <select id="formationSelectMobile" style="font-size:1em; padding:4px 12px; border-radius:6px; border:none; margin-left:8px;">
          <option value="4-2-3-1">4-2-3-1</option>
          <option value="4-3-3">4-3-3</option>
          <option value="4-4-2 (1)">4-4-2 (1)</option>
          <option value="4-4-2 (2)">4-4-2 (2)</option>
          <option value="3-4-1-2">3-4-1-2</option>
          <option value="5-3-2">5-3-2</option>
          <option value="5-2-3">5-2-3</option>
        </select>
      </label>
      <label id="filterLabelMobile" style="color:#fff; font-size:1.2em; font-weight:bold;">
        <input type="checkbox" id="filterByPositionMobile" style="transform:scale(1.3); margin-right:8px; vertical-align:middle;">
        Filtrar jugadores por posición
      </label>
      <br>
      <label id="watermarkLabelMobile" style="color:#fff; font-size:1.2em; font-weight:bold; margin-top:8px; display:inline-block;">
        <input type="checkbox" id="watermarkToggleMobile" style="transform:scale(1.3); margin-right:8px; vertical-align:middle;">
        Marca de agua
      </label>
    </div>
  `;
  // Sincronizar valores y eventos
  document.getElementById('formationSelectMobile').value = document.getElementById('formationSelect').value;
  document.getElementById('formationSelectMobile').onchange = function() {
    document.getElementById('formationSelect').value = this.value;
  };
  document.getElementById('filterByPositionMobile').checked = document.getElementById('filterByPosition').checked;
  document.getElementById('filterByPositionMobile').onchange = function() {
    document.getElementById('filterByPosition').checked = this.checked;
    if (window.renderPositions) window.renderPositions();
  };
  document.getElementById('watermarkToggleMobile').checked = document.getElementById('watermarkToggle').checked;
  document.getElementById('watermarkToggleMobile').onchange = function() {
    document.getElementById('watermarkToggle').checked = this.checked;
    const fieldImg = document.querySelector('.field-img');
    if (this.checked) {
      fieldImg.src = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/Zelaia.jpg';
    } else {
      fieldImg.src = 'https://raw.githubusercontent.com/OriyokoIjitua/TwReal/main/img/other/Zelaia2.jpg';
    }
  };
}
// Detectar si es móvil y renderizar opciones
function checkMobileOptions() {
  if (!document.getElementById('positions')) return; // Esperar a que hamaikakoa esté listo
  if (window.innerWidth <= 700) {
    renderMobileOptions();
  }
  // Re-renderizar posiciones para escalarlas correctamente
  console.log('checkMobileOptions ejecutada, window.renderPositions disponible:', !!window.renderPositions);
  if (window.renderPositions) {
    console.log('Llamando a window.renderPositions()');
    window.renderPositions();
  }
}
window.addEventListener('resize', checkMobileOptions);
document.addEventListener('DOMContentLoaded', checkMobileOptions);
      
      // Llamar cargarDatosTemporada aquí, dentro de initHamaikakoa
      cargarDatosTemporada('2025-26');
    }
    
    // Llamar la función async cuando el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initHamaikakoa);
    } else {
      initHamaikakoa();
    }
