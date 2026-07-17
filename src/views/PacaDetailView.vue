<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const route = useRoute();
const pacaId = Number(route.params.id);
const paca = ref(null);
const mediciones = ref([]);
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

const chartData = computed(() => {
  if (mediciones.value.length === 0) return null;
  return {
    labels: mediciones.value.map(m => fmtFecha(m.fecha)),
    datasets: [{
      label: 'Peso (kg)',
      data: mediciones.value.map(m => m.peso),
      borderColor: getColor(paca.value?.colectivo),
      backgroundColor: getColor(paca.value?.colectivo) + '20',
      fill: true,
      tension: 0.3,
      pointRadius: 5,
      pointHoverRadius: 7,
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
  },
};

const pesoInicial = computed(() => {
  if (mediciones.value.length === 0) return null;
  return mediciones.value[0].peso;
});

const pesoActual = computed(() => {
  if (mediciones.value.length === 0) return null;
  return mediciones.value[mediciones.value.length - 1].peso;
});

const variacion = computed(() => {
  if (!pesoInicial.value || !pesoActual.value) return null;
  return ((pesoActual.value - pesoInicial.value) / pesoInicial.value * 100).toFixed(1);
});

onMounted(async () => {
  try {
    const [pacaRes, medRes] = await Promise.all([
      fetch('/api/pacas/' + pacaId),
      fetch('/api/pacas/' + pacaId + '/mediciones'),
    ]);
    if (pacaRes.ok) paca.value = await pacaRes.json();
    if (medRes.ok) mediciones.value = await medRes.json();
  } catch (e) {
    console.error('Error loading paca:', e);
  }
  loading.value = false;
});
</script>

<template>
  <div v-if="loading" class="space-y-4">
    <div class="h-8 w-64 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
    <div class="h-64 rounded-xl bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
  </div>

  <div v-else-if="paca">
    <div class="mb-6">
      <router-link to="/pacas" class="text-sm text-[#2b5740] dark:text-[#5dd4be] hover:underline mb-2 inline-block">&larr; Volver al inventario</router-link>
      <h1 class="text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">{{ paca.nombre }}</h1>
      <div class="flex items-center gap-2 mt-1">
        <span class="w-3 h-3 rounded-full" :style="{ backgroundColor: getColor(paca.colectivo) }"></span>
        <router-link :to="'/colectivo/' + encodeURIComponent(paca.colectivo)" class="text-sm text-[#2b5740] dark:text-[#5dd4be] hover:underline">{{ paca.colectivo }}</router-link>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ paca.peso ? paca.peso + ' kg' : '-' }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Peso inicial</p>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ pesoActual ? pesoActual + ' kg' : '-' }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Peso actual</p>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold" :class="variacion > 0 ? 'text-[#68c67c]' : variacion < 0 ? 'text-[#fe7763]' : 'text-stone-800 dark:text-stone-100'">{{ variacion ? variacion + '%' : '-' }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Variacion</p>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p class="text-2xl font-bold text-stone-800 dark:text-stone-100">{{ mediciones.length }}</p>
        <p class="text-xs text-stone-500 dark:text-stone-400">Mediciones</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-sm">
      <div class="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-3">
        <span class="text-stone-500 dark:text-stone-400">Fecha inicio:</span>
        <span class="font-medium text-stone-800 dark:text-stone-100 ml-1">{{ fmtFecha(paca.fecha_inicio) }}</span>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-3">
        <span class="text-stone-500 dark:text-stone-400">Participantes:</span>
        <span class="font-medium text-stone-800 dark:text-stone-100 ml-1">{{ paca.participantes || '-' }}</span>
      </div>
      <div class="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 p-3">
        <span class="text-stone-500 dark:text-stone-400">Ubicacion:</span>
        <a v-if="paca.coordenadas_lat" :href="'https://www.openstreetmap.org/?mlat=' + paca.coordenadas_lat + '&mlon=' + paca.coordenadas_lng + '#map=16/' + paca.coordenadas_lat + '/' + paca.coordenadas_lng" target="_blank" class="font-medium text-[#2b5740] dark:text-[#5dd4be] hover:underline ml-1">Ver en mapa</a>
        <span v-else class="font-medium text-stone-800 dark:text-stone-100 ml-1">-</span>
      </div>
    </div>

    <div v-if="paca.informacion" class="bg-[#ffcd6e]/10 dark:bg-[#ffcd6e]/5 rounded-xl border border-[#ffcd6e]/30 dark:border-[#ffcd6e]/15 p-4 mb-6 text-sm text-stone-700 dark:text-stone-300">
      <b>Notas:</b> {{ paca.informacion }}
    </div>

    <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold text-stone-700 dark:text-stone-300">Trazabilidad de peso</h2>
        <router-link :to="'/medicion?paca=' + paca.id" class="text-xs bg-[#2b5740] hover:bg-[#1e3d2c] text-white px-3 py-1 rounded-lg transition-colors">+ Registrar peso</router-link>
      </div>
      <div v-if="chartData" class="h-[250px]">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <p v-else class="text-sm text-stone-400 dark:text-stone-500 text-center py-8">Sin datos de peso aun. Registra la primera medicion.</p>
    </div>

    <div v-if="mediciones.length > 0" class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <h2 class="text-sm font-bold text-stone-700 dark:text-stone-300 mb-3">Historial de mediciones</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700">
            <tr>
              <th class="text-left py-2 px-3">Fecha</th>
              <th class="text-right py-2 px-3">Peso (kg)</th>
              <th class="text-left py-2 px-3 hidden sm:table-cell">Notas</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100 dark:divide-stone-700">
            <tr v-for="m in [...mediciones].reverse()" :key="m.id" class="hover:bg-stone-50 dark:hover:bg-stone-700/50">
              <td class="py-2 px-3 text-stone-800 dark:text-stone-100">{{ fmtFecha(m.fecha) }}</td>
              <td class="py-2 px-3 text-right font-medium text-stone-800 dark:text-stone-100">{{ m.peso }}</td>
              <td class="py-2 px-3 text-stone-500 dark:text-stone-400 text-xs hidden sm:table-cell">{{ m.notas || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div v-else class="text-center py-12 text-stone-500 dark:text-stone-400">
    Paca no encontrada.
  </div>
</template>
