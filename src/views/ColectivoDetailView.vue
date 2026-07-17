<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const route = useRoute();
const nombre = decodeURIComponent(route.params.nombre);
const colectivo = ref(null);
const loading = ref(true);

const colores = {
  'Paquerxs del Parkway': '#68c67c',
  'Paquerxs de San Luis': '#5dd4be',
  'Paquerxs del Neuque': '#ffcd6e',
  'Paquerxs de La Marchita': '#fe7763',
  'Paquerxs Armenia': '#2b5740',
};

function getColor(n) {
  return colores[n] || '#68c67c';
}

function fmtFecha(fecha) {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

const chartData = computed(() => {
  if (!colectivo.value?.pacas) return null;
  const pacas = [...colectivo.value.pacas].reverse();
  return {
    labels: pacas.map(p => p.nombre.length > 20 ? p.nombre.substring(0, 20) + '...' : p.nombre),
    datasets: [{
      label: 'Peso (kg)',
      data: pacas.map(p => p.peso || 0),
      backgroundColor: getColor(nombre) + '99',
      borderColor: getColor(nombre),
      borderWidth: 1,
    }],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: 'kg' } },
    x: { ticks: { maxRotation: 45 } },
  },
};

onMounted(async () => {
  try {
    const res = await fetch('/api/colectivos/' + encodeURIComponent(nombre));
    if (res.ok) {
      colectivo.value = await res.json();
    }
  } catch (e) {
    console.error('Error loading colectivo:', e);
  }
  loading.value = false;
});
</script>

<template>
  <div v-if="loading" class="space-y-4">
    <div class="h-8 w-64 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
    <div class="h-48 rounded-xl bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
  </div>

  <div v-else-if="colectivo">
    <div class="mb-8">
      <router-link to="/colectivos" class="text-sm text-[#2b5740] dark:text-[#5dd4be] hover:underline mb-2 inline-block">&larr; Volver a colectivos</router-link>
      <div class="flex items-center gap-3">
        <span class="w-5 h-5 rounded-full flex-shrink-0" :style="{ backgroundColor: getColor(nombre) }"></span>
        <h1 class="text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">{{ nombre }}</h1>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ colectivo.total_pacas }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Pacas</p>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ colectivo.total_kg ? colectivo.total_kg.toFixed(1) : '0' }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Total kg</p>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ colectivo.kg_por_paca ? colectivo.kg_por_paca.toFixed(1) : '0' }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Promedio kg/paca</p>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ fmtFecha(colectivo.primera_fecha) }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Primera medicion</p>
      </div>
    </div>

    <div v-if="chartData" class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 mb-6">
      <h2 class="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3">Peso por paca</h2>
      <div class="h-[250px]">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div>
      <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-3">Pacas del colectivo</h2>
      <div class="space-y-2">
        <router-link
          v-for="p in colectivo.pacas" :key="p.id"
          :to="'/paca/' + p.id"
          class="flex items-center justify-between bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-3 hover:shadow-sm transition-shadow"
        >
          <div>
            <p class="font-medium text-stone-800 dark:text-stone-100 text-sm">{{ p.nombre }}</p>
            <p class="text-xs text-stone-500 dark:text-stone-400">{{ fmtFecha(p.fecha_inicio) }}</p>
          </div>
          <span class="text-sm font-bold text-stone-700 dark:text-stone-300">{{ p.peso ? p.peso + ' kg' : '-' }}</span>
        </router-link>
      </div>
    </div>
  </div>

  <div v-else class="text-center py-12 text-stone-500 dark:text-stone-400">
    Colectivo no encontrado.
  </div>
</template>
