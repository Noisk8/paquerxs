<script setup>
import { ref, computed, onMounted } from 'vue';

const PAGE_SIZE = 20;
const allPacas = ref([]);
const displayed = ref(0);
const total = ref(0);
const loading = ref(false);
const vistaActual = ref('tarjetas');
const filtroColectivo = ref('');
const filtroNombre = ref('');
const isAdmin = ref(false);

const pacasFiltradas = computed(() => {
  return allPacas.value.filter(p => {
    const matchCol = !filtroColectivo.value || p.colectivo === filtroColectivo.value;
    const matchNom = !filtroNombre.value || p.nombre.toLowerCase().includes(filtroNombre.value.toLowerCase());
    return matchCol && matchNom;
  });
});

function fmt(fecha) {
  return new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function fetchPacas(offset) {
  loading.value = true;
  try {
    const res = await fetch(`/api/pacas?limit=${PAGE_SIZE}&offset=${offset}`);
    const data = await res.json();
    total.value = data.pagination.total;
    return data.data;
  } catch (e) {
    return [];
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  const more = await fetchPacas(displayed.value);
  if (more.length > 0) {
    allPacas.value = [...allPacas.value, ...more];
    displayed.value += more.length;
  }
}

async function eliminar(id) {
  if (!confirm('Eliminar esta paca?')) return;
  try {
    const res = await fetch(`/api/pacas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      allPacas.value = allPacas.value.filter(p => p.id !== id);
    } else {
      alert('Error al eliminar');
    }
  } catch (e) {
    alert('Error de conexion');
  }
}

onMounted(async () => {
  const first = await fetchPacas(0);
  allPacas.value = first;
  displayed.value = first.length;

  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    isAdmin.value = data.admin;
  } catch (e) {}
});
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100">Inventario de Pacas</h1>
      <p class="text-stone-500 dark:text-stone-400 mt-1">{{ pacasFiltradas.length }} pacas</p>
    </div>
    <router-link to="/formulario" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm text-center">
      + Nueva Paca
    </router-link>
  </div>

  <div class="flex flex-col sm:flex-row gap-3 mb-6">
    <select v-model="filtroColectivo"
      class="rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white flex-1 sm:flex-none sm:w-56">
      <option value="">Todos los colectivos</option>
      <option value="Paquerxs del Parkway">Parkway</option>
      <option value="Paquerxs de San Luis">San Luis</option>
      <option value="Paquerxs del Neuque">Neuque</option>
      <option value="Paquerxs de La Marchita">La Marchita</option>
      <option value="Paquerxs Armenia">Armenia</option>
    </select>
    <input v-model="filtroNombre" type="text" placeholder="Buscar por nombre..."
      class="rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 border px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none flex-1" />
    <div class="flex border border-stone-300 dark:border-stone-600 rounded-lg overflow-hidden">
      <button @click="vistaActual = 'tarjetas'"
        :class="['px-3 py-2 text-sm cursor-pointer', vistaActual === 'tarjetas' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400']">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
      </button>
      <button @click="vistaActual = 'tabla'"
        :class="['px-3 py-2 text-sm cursor-pointer', vistaActual === 'tabla' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400']">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
      </button>
    </div>
  </div>

  <!-- Tarjetas -->
  <div v-if="vistaActual === 'tarjetas'" class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    <template v-if="loading && allPacas.length === 0">
      <div v-for="i in 6" :key="i" class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 space-y-3">
        <div class="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        <div class="space-y-2">
          <div class="h-3 w-full rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
          <div class="h-3 w-5/6 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
          <div class="h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        </div>
      </div>
    </template>
    <article v-for="p in pacasFiltradas" :key="p.id"
      class="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-4 hover:shadow-md transition-shadow">
      <h3 class="font-bold text-emerald-800 dark:text-emerald-400 text-sm leading-tight mb-2">{{ p.nombre }}</h3>
      <div class="space-y-0.5 text-xs text-stone-600 dark:text-stone-300">
        <p><b>Colectivo:</b> {{ p.colectivo }}</p>
        <p><b>Peso:</b> {{ p.peso != null ? p.peso + ' kg' : '-' }}</p>
        <p><b>Fecha:</b> {{ fmt(p.fecha_inicio) }}</p>
        <p><b>Part.:</b> {{ p.participantes != null ? p.participantes : '-' }}</p>
      </div>
      <p v-if="p.coordenadas_lat != null" class="text-stone-500 dark:text-stone-400 text-xs mt-1">
        <a :href="'https://www.openstreetmap.org/?mlat=' + p.coordenadas_lat + '&mlon=' + p.coordenadas_lng + '#map=16/' + p.coordenadas_lat + '/' + p.coordenadas_lng" target="_blank" class="text-emerald-600 dark:text-emerald-400 hover:underline">Ver en mapa</a>
      </p>
      <p v-if="p.informacion" class="text-stone-500 dark:text-stone-400 italic text-xs mt-1 border-t border-stone-100 dark:border-stone-700 pt-1">{{ p.informacion }}</p>
      <div v-if="isAdmin" class="mt-2">
        <button @click="eliminar(p.id)" class="text-xs bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800 text-red-700 dark:text-red-400 px-3 py-1 rounded-lg cursor-pointer">Eliminar</button>
      </div>
    </article>
  </div>

  <!-- Tabla -->
  <div v-if="vistaActual === 'tabla'" class="overflow-x-auto">
    <table class="w-full text-sm text-left">
      <thead class="text-xs text-stone-500 dark:text-stone-400 uppercase bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
        <tr>
          <th class="px-4 py-3">Nombre</th>
          <th class="px-4 py-3 hidden sm:table-cell">Colectivo</th>
          <th class="px-4 py-3 hidden md:table-cell">Peso</th>
          <th class="px-4 py-3">Fecha</th>
          <th class="px-4 py-3 hidden lg:table-cell">Part.</th>
          <th class="px-4 py-3 hidden lg:table-cell">Info</th>
          <th class="px-4 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
        <tr v-for="p in pacasFiltradas" :key="p.id" class="bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800">
          <td class="px-4 py-3 font-medium text-stone-800 dark:text-stone-200 text-sm max-w-[200px] truncate">{{ p.nombre }}</td>
          <td class="px-4 py-3 text-stone-600 dark:text-stone-400 hidden sm:table-cell">{{ p.colectivo }}</td>
          <td class="px-4 py-3 text-stone-600 dark:text-stone-400 hidden md:table-cell">{{ p.peso != null ? p.peso + ' kg' : '-' }}</td>
          <td class="px-4 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">{{ fmt(p.fecha_inicio) }}</td>
          <td class="px-4 py-3 text-stone-600 dark:text-stone-400 hidden lg:table-cell">{{ p.participantes != null ? p.participantes : '-' }}</td>
          <td class="px-4 py-3 text-stone-500 dark:text-stone-400 text-xs max-w-[150px] truncate hidden lg:table-cell">{{ p.informacion || '' }}</td>
          <td class="px-4 py-3 text-right">
            <button v-if="isAdmin" @click="eliminar(p.id)" class="text-xs bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg cursor-pointer">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <p v-if="!loading && pacasFiltradas.length === 0" class="text-center text-stone-500 dark:text-stone-400 py-12">No se encontraron pacas.</p>

  <div v-if="displayed < total" class="text-center py-6">
    <button @click="loadMore" :disabled="loading"
      class="bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer text-sm">
      {{ loading ? 'Cargando...' : 'Cargar mas pacas' }}
    </button>
  </div>
</template>
