<script setup>
import { ref, onMounted } from 'vue';

const colectivos = ref([]);
const loading = ref(true);

const colores = {
  'Paquerxs del Parkway': '#68c67c',
  'Paquerxs de San Luis': '#5dd4be',
  'Paquerxs del Neuque': '#ffcd6e',
  'Paquerxs de La Marchita': '#fe7763',
  'Paquerxs Armenia': '#2b5740',
};

function getColor(nombre) {
  return colores[nombre] || '#68c67c';
}

function fmtFecha(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

onMounted(async () => {
  try {
    const res = await fetch('/api/colectivos');
    colectivos.value = await res.json();
  } catch (e) {
    console.error('Error loading colectivos:', e);
  }
  loading.value = false;
});
</script>

<template>
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-stone-800 dark:text-stone-100">Colectivos</h1>
    <p class="text-stone-500 dark:text-stone-400 mt-1">Colectivos ciudadanos de pacas digestoras en Teusaquillo</p>
  </div>

  <div v-if="loading" class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    <div v-for="i in 5" :key="i" class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 space-y-3">
      <div class="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
      <div class="h-3 w-full rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
    </div>
  </div>

  <div v-else class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
    <router-link
      v-for="c in colectivos" :key="c.nombre"
      :to="'/colectivo/' + encodeURIComponent(c.nombre)"
      class="block bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-5 hover:shadow-md transition-shadow"
    >
      <div class="flex items-center gap-3 mb-3">
        <span class="w-4 h-4 rounded-full flex-shrink-0" :style="{ backgroundColor: getColor(c.nombre) }"></span>
        <h2 class="font-bold text-stone-800 dark:text-stone-100 text-sm leading-tight">{{ c.nombre }}</h2>
      </div>
      <div class="space-y-1 text-xs text-stone-500 dark:text-stone-400">
        <p><b class="text-stone-700 dark:text-stone-300">Pacas:</b> {{ c.total_pacas }}</p>
        <p><b class="text-stone-700 dark:text-stone-300">Total kg recogidos:</b> {{ c.total_kg ? c.total_kg.toFixed(1) : '0' }} kg</p>
        <p><b class="text-stone-700 dark:text-stone-300">Promedio kg/paca:</b> {{ c.kg_por_paca ? c.kg_por_paca.toFixed(1) : '0' }} kg</p>
        <p v-if="c.primera_fecha"><b class="text-stone-700 dark:text-stone-300">Activo desde:</b> {{ fmtFecha(c.primera_fecha) }}</p>
      </div>
    </router-link>
  </div>

  <p v-if="!loading && colectivos.length === 0" class="text-center text-stone-500 dark:text-stone-400 py-12">No hay colectivos registrados.</p>
</template>
