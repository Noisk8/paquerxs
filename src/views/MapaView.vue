<script setup>
import { ref, onMounted, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pacas = ref([]);
const loading = ref(true);
const filtroColectivo = ref('');
const filtroNombre = ref('');
const contador = ref(0);
const coloresMap = ref({});

let map = null;
let markers = [];

function createPopup(p) {
  const peso = p.peso != null ? p.peso + ' kg' : 'N/A';
  const part = p.participantes != null ? p.participantes : 'N/A';
  const fecha = new Date(p.fecha_inicio).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  const color = coloresMap.value[p.colectivo] || '#68c67c';
  return `<div style="font-family:system-ui;min-width:200px;">
    <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:${color};">${p.nombre}</h3>
    <div style="font-size:13px;color:#44403c;line-height:1.6;">
      <p style="margin:0;"><b>Colectivo:</b> ${p.colectivo}</p>
      <p style="margin:0;"><b>Peso:</b> ${peso}</p>
      <p style="margin:0;"><b>Fecha:</b> ${fecha}</p>
      <p style="margin:0;"><b>Participantes:</b> ${part}</p>
      ${p.informacion ? `<p style="margin:4px 0 0 0;font-style:italic;color:#78716c;">${p.informacion}</p>` : ''}
    </div></div>`;
}

function renderMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const filtradas = pacas.value.filter(p => {
    const matchCol = !filtroColectivo.value || p.colectivo === filtroColectivo.value;
    const matchNom = !filtroNombre.value || p.nombre.toLowerCase().includes(filtroNombre.value.toLowerCase());
    return matchCol && matchNom;
  });

  contador.value = filtradas.length;

  filtradas.forEach(p => {
    const icon = L.icon({
      iconUrl: '/icons/paca.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      className: 'custom-marker',
    });
    const m = L.marker([p.coordenadas_lat, p.coordenadas_lng], { icon }).addTo(map);
    m.bindPopup(createPopup(p));
    markers.push(m);
  });

  if (filtradas.length > 0) {
    const bounds = L.latLngBounds(filtradas.map(p => [p.coordenadas_lat, p.coordenadas_lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

onMounted(async () => {
  try {
    const [pacasRes, colectivosRes] = await Promise.all([
      fetch('/api/pacas?limit=500&offset=0'),
      fetch('/api/colectivos'),
    ]);
    const pacasData = await pacasRes.json();
    pacas.value = pacasData.data.filter(p => p.coordenadas_lat != null && p.coordenadas_lng != null);

    if (colectivosRes.ok) {
      const colectivos = await colectivosRes.json();
      for (const c of colectivos) {
        coloresMap.value[c.nombre] = c.color;
      }
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }

  loading.value = false;
  await nextTick();

  map = L.map('mapa-container').setView([4.64, -74.075], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  map.whenReady(() => map.invalidateSize());
  renderMarkers();
});

function onFilterChange() {
  if (map) renderMarkers();
}
</script>

<template>
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100">Mapa de Pacas</h1>
    <p class="text-stone-500 dark:text-stone-400 mt-1">Ubicacion geografica de las pacas en Teusaquillo</p>
  </div>

  <div class="space-y-3 mb-4">
    <div class="flex flex-col sm:flex-row gap-3">
      <select v-model="filtroColectivo" @change="onFilterChange"
        class="w-full rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white flex-1 sm:flex-none sm:w-56">
        <option value="">Todos los colectivos</option>
        <option v-for="(color, nombre) in coloresMap" :key="nombre" :value="nombre">{{ nombre.replace('Paquerxs ', '') }}</option>
      </select>
      <input v-model="filtroNombre" @input="onFilterChange" type="text" placeholder="Buscar paca por nombre..."
        class="w-full rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none flex-1" />
      <div class="flex items-center text-sm text-stone-500 dark:text-stone-400 px-2 whitespace-nowrap">
        {{ contador }} pacas en mapa
      </div>
    </div>
  </div>

  <div v-if="loading" class="relative w-full h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
    <div class="absolute inset-0 bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
    <div class="absolute inset-0 flex items-center justify-center">
      <span class="text-sm text-stone-400 dark:text-stone-500">Cargando mapa...</span>
    </div>
  </div>

  <div id="mapa-container" class="w-full h-[400px] sm:h-[500px] rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 z-0" :class="{ hidden: loading }"></div>

  <div class="flex flex-wrap gap-3 mt-4 text-sm text-stone-600 dark:text-stone-400">
    <span v-for="(color, nombre) in coloresMap" :key="nombre" class="flex items-center gap-1.5">
      <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: color }"></span> {{ nombre.replace('Paquerxs ', '') }}
    </span>
  </div>
</template>

<style>
.custom-marker { background: transparent !important; border: none !important; }
.leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.leaflet-popup-content { margin: 12px 16px; }
</style>
