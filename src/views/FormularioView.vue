<script setup>
import { ref, onMounted, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const colectivos = [
  'Paquerxs del Parkway',
  'Paquerxs de San Luis',
  'Paquerxs del Neuque',
  'Paquerxs de La Marchita',
  'Paquerxs Armenia',
];

const form = ref({
  nombre: '',
  colectivo: '',
  peso: '',
  fecha_inicio: '',
  coordenadas_lat: '',
  coordenadas_lng: '',
  participantes: '',
  informacion: '',
});

const errors = ref({});
const mensaje = ref({ text: '', type: '' });
const submitting = ref(false);
const ubicacionEstado = ref('');
const ubicacionTipo = ref('');
const btnUbicacionTxt = ref('Mi ubicacion');

let map = null;
let marker = null;
let accuracyCircle = null;
let watchId = null;
let bestAccuracy = Infinity;

function updateInputs(lat, lng) {
  form.value.coordenadas_lat = lat.toFixed(7);
  form.value.coordenadas_lng = lng.toFixed(7);
}

function placeMarker(lat, lng, acc) {
  const icon = L.icon({
    iconUrl: '/icons/paca.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    className: 'form-marker',
  });
  if (marker) map.removeLayer(marker);
  if (accuracyCircle) map.removeLayer(accuracyCircle);
  marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    updateInputs(pos.lat, pos.lng);
  });
  if (acc) {
    accuracyCircle = L.circle([lat, lng], { radius: acc, color: '#059669', fillOpacity: 0.08, weight: 1 }).addTo(map);
  }
  map.setView([lat, lng], 16);
}

function setEstado(txt, tipo) {
  ubicacionEstado.value = txt;
  ubicacionTipo.value = tipo;
}

function setLoading(on) {
  btnUbicacionTxt.value = on ? 'Obteniendo...' : 'Mi ubicacion';
}

function onPos(pos) {
  const acc = pos.coords.accuracy;
  if (acc < bestAccuracy) {
    bestAccuracy = acc;
    updateInputs(pos.coords.latitude, pos.coords.longitude);
    placeMarker(pos.coords.latitude, pos.coords.longitude, acc);
  }
  if (acc <= 15) {
    stopWatch();
    btnUbicacionTxt.value = 'GPS preciso';
    setEstado('Precision: ~' + acc.toFixed(0) + 'm', 'ok');
    setLoading(false);
  } else {
    setEstado('Precision: ~' + acc.toFixed(0) + 'm — mejorando...', 'info');
  }
}

function onErr(e) {
  if (watchId !== null) return;
  const m = { 1: 'Permiso denegado.', 2: 'Ubicacion no disponible.', 3: 'Intenta de nuevo.' };
  setEstado(m[e.code] || 'Error.', 'error');
  setLoading(false);
}

function stopWatch() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
}

function getMyLocation() {
  if (!navigator.geolocation) { setEstado('No soportado.', 'error'); return; }
  stopWatch();
  bestAccuracy = Infinity;
  setLoading(true);
  setEstado('Buscando GPS...', 'info');

  navigator.geolocation.getCurrentPosition((pos) => {
    onPos(pos);
    if (pos.coords.accuracy > 15) {
      watchId = navigator.geolocation.watchPosition(onPos, () => {}, {
        enableHighAccuracy: true, timeout: 60000, maximumAge: 0,
      });
      setTimeout(() => {
        stopWatch();
        if (bestAccuracy < Infinity) {
          btnUbicacionTxt.value = 'Ubicacion ok';
          setEstado('Precision final: ~' + bestAccuracy.toFixed(0) + 'm', bestAccuracy <= 30 ? 'ok' : 'info');
          setLoading(false);
        }
      }, 30000);
    }
  }, onErr, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 });
}

function validateForm() {
  errors.value = {};
  let valid = true;

  if (!form.value.nombre.trim()) { errors.value.nombre = 'Ingresa el nombre de la paca'; valid = false; }
  if (!form.value.colectivo) { errors.value.colectivo = 'Selecciona un colectivo'; valid = false; }
  if (!form.value.peso || parseFloat(form.value.peso) < 0.1) { errors.value.peso = 'Ingresa el peso (minimo 0.1 kg)'; valid = false; }
  if (!form.value.fecha_inicio) { errors.value.fecha_inicio = 'Selecciona una fecha'; valid = false; }
  if (!form.value.coordenadas_lat || !form.value.coordenadas_lng) { errors.value.coordenadas = 'Ubica la paca en el mapa o ingresa las coordenadas'; valid = false; }
  if (!form.value.participantes || parseInt(form.value.participantes) < 1) { errors.value.participantes = 'Ingresa el numero de participantes (minimo 1)'; valid = false; }
  if (!form.value.informacion.trim()) { errors.value.informacion = 'Agrega informacion sobre la paca'; valid = false; }

  return valid;
}

async function submitForm() {
  mensaje.value = { text: '', type: '' };
  if (!validateForm()) return;

  submitting.value = true;
  try {
    const data = {};
    for (const [k, v] of Object.entries(form.value)) {
      data[k] = v || null;
    }
    const res = await fetch('/api/pacas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const r = await res.json();
    if (res.ok) {
      mensaje.value = { text: 'Paca registrada exitosamente.', type: 'ok' };
      form.value = { nombre: '', colectivo: '', peso: '', fecha_inicio: '', coordenadas_lat: '', coordenadas_lng: '', participantes: '', informacion: '' };
      errors.value = {};
      if (marker) { map.removeLayer(marker); marker = null; }
      if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
      bestAccuracy = Infinity;
      ubicacionEstado.value = '';
      btnUbicacionTxt.value = 'Mi ubicacion';
      marker = L.marker([4.64, -74.075], { draggable: true, icon: L.icon({ iconUrl: '/icons/paca.png', iconSize: [32, 32], iconAnchor: [16, 32], className: 'form-marker' }) }).addTo(map);
      marker.on('dragend', () => { const pos = marker.getLatLng(); updateInputs(pos.lat, pos.lng); });
    } else {
      mensaje.value = { text: r.error || 'Error al guardar.', type: 'error' };
    }
  } catch (e) {
    mensaje.value = { text: 'Error de conexion.', type: 'error' };
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await nextTick();
  map = L.map('mapa-form', { zoomControl: false }).setView([4.64, -74.075], 14);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  const defaultIcon = L.icon({ iconUrl: '/icons/paca.png', iconSize: [32, 32], iconAnchor: [16, 32], className: 'form-marker' });
  marker = L.marker([4.64, -74.075], { draggable: true, icon: defaultIcon }).addTo(map);
  marker.on('dragend', () => { const pos = marker.getLatLng(); updateInputs(pos.lat, pos.lng); });

  if (navigator.geolocation) {
    setEstado('Buscando tu ubicacion...', 'info');
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      updateInputs(lat, lng);
      placeMarker(lat, lng, pos.coords.accuracy);
      setEstado('Ubicacion detectada — ajusta el pin si necesario', 'ok');
    }, () => {
      setEstado('No se pudo obtener ubicacion — mueve el pin manualmente', 'info');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }
});
</script>

<template>
  <form @submit.prevent="submitForm" class="space-y-5 max-w-2xl mx-auto" novalidate>
    <h2 class="text-2xl font-bold text-emerald-800 dark:text-emerald-400 mb-6">Registrar Nueva Paca</h2>

    <div>
      <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Nombre de la paca *</label>
      <input v-model="form.nombre" type="text" placeholder="Ej: Paca Biodigestora Silva Parkway 27-07-25"
        :class="['w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dark:bg-stone-800 dark:text-stone-200', errors.nombre ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']" />
      <p v-if="errors.nombre" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.nombre }}</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Colectivo *</label>
      <select v-model="form.colectivo"
        :class="['w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-stone-800 dark:text-stone-200', errors.colectivo ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']">
        <option value="">Seleccionar Colectivo</option>
        <option v-for="c in colectivos" :key="c" :value="c">{{ c }}</option>
      </select>
      <p v-if="errors.colectivo" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.colectivo }}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Peso (kg) *</label>
        <input v-model="form.peso" type="number" step="0.1" min="0.1" placeholder="Ej: 150"
          :class="['w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dark:bg-stone-800 dark:text-stone-200', errors.peso ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']" />
        <p v-if="errors.peso" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.peso }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Fecha de inicio *</label>
        <input v-model="form.fecha_inicio" type="date"
          :class="['w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dark:bg-stone-800 dark:text-stone-200', errors.fecha_inicio ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']" />
        <p v-if="errors.fecha_inicio" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.fecha_inicio }}</p>
      </div>
    </div>

    <div class="bg-stone-100 dark:bg-stone-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-stone-700 dark:text-stone-300">Ubicacion *</label>
        <button type="button" @click="getMyLocation"
          class="inline-flex items-center gap-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          {{ btnUbicacionTxt }}
        </button>
      </div>
      <p v-if="ubicacionEstado" :class="['text-xs', ubicacionTipo === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : ubicacionTipo === 'error' ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400']">{{ ubicacionEstado }}</p>

      <div id="mapa-form" class="w-full h-[250px] sm:h-[300px] rounded-lg border border-stone-300 dark:border-stone-600 z-0"></div>
      <p class="text-xs text-stone-400 dark:text-stone-500 italic">Arrastra el pin para ajustar la posicion exacta</p>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1">Latitud *</label>
          <input v-model="form.coordenadas_lat" type="number" step="0.0000001" placeholder="4.6287778"
            :class="['w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-stone-800 dark:text-stone-200', errors.coordenadas ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']" />
        </div>
        <div>
          <label class="block text-xs text-stone-500 dark:text-stone-400 mb-1">Longitud *</label>
          <input v-model="form.coordenadas_lng" type="number" step="0.0000001" placeholder="-74.0752778"
            :class="['w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-stone-800 dark:text-stone-200', errors.coordenadas ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']" />
        </div>
      </div>
      <p v-if="errors.coordenadas" class="text-xs text-red-600 dark:text-red-400">{{ errors.coordenadas }}</p>
      <button type="button" @click="() => { const lat = parseFloat(form.coordenadas_lat); const lng = parseFloat(form.coordenadas_lng); if (!isNaN(lat) && !isNaN(lng)) placeMarker(lat, lng, null); }"
        class="w-full mt-2 text-xs bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
        Mover pin a estas coordenadas
      </button>
    </div>

    <div>
      <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Numero de participantes *</label>
      <input v-model="form.participantes" type="number" min="1" placeholder="Ej: 10"
        :class="['w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none dark:bg-stone-800 dark:text-stone-200', errors.participantes ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']" />
      <p v-if="errors.participantes" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.participantes }}</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Informacion adicional *</label>
      <textarea v-model="form.informacion" rows="3" placeholder="Notas, observaciones..."
        :class="['w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y dark:bg-stone-800 dark:text-stone-200', errors.informacion ? 'border-red-500 dark:border-red-500' : 'border-stone-300 dark:border-stone-600']"></textarea>
      <p v-if="errors.informacion" class="text-xs text-red-600 dark:text-red-400 mt-1">{{ errors.informacion }}</p>
    </div>

    <div v-if="mensaje.text"
      :class="['rounded-lg p-4 text-sm', mensaje.type === 'ok' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300']">
      {{ mensaje.text }}
    </div>

    <button type="submit" :disabled="submitting"
      class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors cursor-pointer text-sm sm:text-base disabled:opacity-50">
      {{ submitting ? 'Guardando...' : 'Guardar Paca' }}
    </button>
  </form>
</template>

<style>
#mapa-form { background: #e5e5e5; }
.form-marker { background: transparent !important; border: none !important; }
</style>
