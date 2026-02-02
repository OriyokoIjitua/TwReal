// Configuración de i18next
async function initializeI18n() {
  // Determinar ruta base
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isDev ? '../locales/' : './locales/';

  try {
    // Cargar archivos de traducción
    const euData = await fetch(baseUrl + 'eu.json').then(r => r.json());
    const esData = await fetch(baseUrl + 'es.json').then(r => r.json());

    // Inicializar i18next
    await i18next.init({
      lng: localStorage.getItem('lang') || 'eu', // Euskera por defecto
      fallbackLng: 'eu',
      resources: {
        eu: { translation: euData },
        es: { translation: esData }
      },
      interpolation: {
        escapeValue: false
      }
    });

    // Establecer el idioma global
    window.currentLang = i18next.language;
    
    // Mostrar contenido ahora que está listo
    showPageContent();

    return i18next;
  } catch (error) {
    console.error('Error initializing i18next:', error);
    // Fallback silencioso si no puede cargar los JSONs
    return null;
  }
}

// Helper function para traducir
function t(key) {
  if (!i18next.isInitialized) {
    console.warn('i18next not initialized yet');
    return key;
  }
  return i18next.t(key);
}

// Mostrar la página cuando i18next esté listo
function showPageContent() {
  // Traducir la barra lateral primero
  const menuPlantilla = document.getElementById('menu-plantilla');
  const menuOnce = document.getElementById('menu-once');
  const menuMerkatu = document.getElementById('menu-merkatu');
  
  if (menuPlantilla) menuPlantilla.textContent = t('menu.plantilla');
  if (menuOnce) menuOnce.textContent = t('menu.once');
  if (menuMerkatu) menuMerkatu.textContent = t('menu.merkatu');
  
  // Marcar que i18next está listo
  document.body.setAttribute('data-i18n-ready', 'true');
  
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.style.display = '';
    mainContent.style.visibility = 'visible';
  }
}

// Cambiar idioma y actualizar UI
function changeLanguage(lang) {
  i18next.changeLanguage(lang);
  window.currentLang = lang;
  localStorage.setItem('lang', lang);
  // Triggear evento personalizado para que otros scripts se enteren
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}
