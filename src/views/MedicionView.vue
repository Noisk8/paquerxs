<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const pacas = ref([]);
const loading = ref(true);
const submitting = ref(false);
const mensaje = ref({ text: '', type: '' });

const form = ref({
  paca_id: route.query.paca ? Number(route.query.paca) : '',
  peso: '',
  fecha: new Date().toISOString().split('T')[0],
  notas: '',
});

const errors = ref({});

function validate() {
  errors.value = {};
  if (!form.value.paca_id) errors.value.paca_id = 'Selecciona una paca';
  if (!form.value.peso || isNaN(Number(form.value.peso)) || Number(form.value.peso) < 0) errors.value.peso = 'Ingresa un peso valido';
  if (!form.value.fecha) errors.value.fecha = 'La fecha es obligatoria';
  return Object.keys(errors.value).length === 0;
}

async function submitForm() {
  if (!validate()) return;
  submitting.value = true;
  mensaje.value = { text: '', type: '' };

  try {
    const res = await fetch('/api/pacas/' + form.value.paca_id + '/mediciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peso: Number(form.value.peso),
        fecha: form.value.fecha,
        notas: form.value.notas || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      mensaje.value = { text: 'Medicion registrada exitosamente', type: 'ok' };
      form.value.peso = '';
      form.value.notas = '';
      form.value.fecha = new Date().toISOString().split('T')[0];
    } else {
      mensaje.value = { text: data.error || 'Error al registrar', type: 'error' };
    }
  } catch (e) {
    mensaje.value = { text: 'Error de conexion', type: 'error' };
  }
  submitting.value = false;
}

onMounted(async () => {
  try {
    const res = await fetch('/api/pacas?limit=500&offset=0');
    const data = await res.json();
    pacas.value = data.data;
  } catch (e) {
    console.error('Error loading pacas:', e);
  }
  loading.value = false;
});
</script>

<template>
  <div class="max-w-lg mx-auto">
    <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6">Registrar Medicion de Peso</h1>

    <div v-if="loading" class="space-y-4 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
      <div class="space-y-1">
        <div class="h-4 w-20 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="h-4 w-20 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
          <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        </div>
        <div class="space-y-1">
          <div class="h-4 w-16 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
          <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        </div>
      </div>
      <div class="space-y-1">
        <div class="h-4 w-28 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        <div class="h-16 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
      </div>
      <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
    </div>

    <form v-else @submit.prevent="submitForm" class="space-y-4 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6" novalidate>
      <div>
        <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Paca *</label>
        <select v-model="form.paca_id"
          :class="['w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none bg-white dark:bg-stone-900 dark:text-stone-200', errors.paca_id ? 'border-[#fe7763]' : 'border-stone-300 dark:border-stone-600']">
          <option value="">Seleccionar Paca</option>
          <option v-for="p in pacas" :key="p.id" :value="p.id">{{ p.nombre }} ({{ p.colectivo }})</option>
        </select>
        <p v-if="errors.paca_id" class="text-xs text-[#fe7763] mt-1">{{ errors.paca_id }}</p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Peso (kg) *</label>
          <input v-model="form.peso" type="number" step="0.1" min="0" placeholder="Ej: 150"
            :class="['w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none dark:bg-stone-900 dark:text-stone-200', errors.peso ? 'border-[#fe7763]' : 'border-stone-300 dark:border-stone-600']" />
          <p v-if="errors.peso" class="text-xs text-[#fe7763] mt-1">{{ errors.peso }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Fecha *</label>
          <input v-model="form.fecha" type="date"
            :class="['w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none dark:bg-stone-900 dark:text-stone-200', errors.fecha ? 'border-[#fe7763]' : 'border-stone-300 dark:border-stone-600']" />
          <p v-if="errors.fecha" class="text-xs text-[#fe7763] mt-1">{{ errors.fecha }}</p>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Notas (opcional)</label>
        <textarea v-model="form.notas" rows="2" placeholder="Observaciones..."
          class="w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none resize-y dark:bg-stone-900 dark:text-stone-200"></textarea>
      </div>

      <div v-if="mensaje.text"
        :class="['rounded-lg p-3 text-sm', mensaje.type === 'ok' ? 'bg-[#68c67c]/15 text-[#2b5740] dark:text-[#68c67c]' : 'bg-[#fe7763]/15 text-[#a63526] dark:text-[#fe7763]']">
        {{ mensaje.text }}
      </div>

      <button type="submit" :disabled="submitting"
        class="w-full bg-[#2b5740] hover:bg-[#1e3d2c] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-sm disabled:opacity-50">
        {{ submitting ? 'Guardando...' : 'Registrar Medicion' }}
      </button>
    </form>
  </div>
</template>
