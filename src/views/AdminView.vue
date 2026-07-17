<script setup>
import { ref, onMounted } from 'vue';

const isLoggedIn = ref(false);
const loadingAuth = ref(true);
const username = ref('');
const password = ref('');
const error = ref('');

const colectivos = ref([]);
const users = ref([]);
const showColectivoForm = ref(false);
const editingColectivo = ref(null);
const colectivoForm = ref({ nombre: '', color: '#68c67c' });
const colectivoMsg = ref({ text: '', type: '' });

const presetColors = [
  '#68c67c', '#5dd4be', '#ffcd6e', '#fe7763', '#2b5740',
  '#d4e8e4', '#f2f2f2', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#a855f7',
];

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    isLoggedIn.value = data.admin;
    if (data.admin) {
      loadColectivos();
      loadUsers();
    }
  } catch (e) {}
  loadingAuth.value = false;
}

async function login() {
  error.value = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });
    const data = await res.json();
    if (res.ok) {
      isLoggedIn.value = true;
      username.value = '';
      password.value = '';
      loadColectivos();
      loadUsers();
    } else {
      error.value = data.error || 'Error al iniciar sesion';
    }
  } catch (e) {
    error.value = 'Error de conexion';
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  isLoggedIn.value = false;
}

async function loadColectivos() {
  try {
    const res = await fetch('/api/admin/colectivos');
    if (res.ok) colectivos.value = await res.json();
  } catch (e) {}
}

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users');
    if (res.ok) users.value = await res.json();
  } catch (e) {}
}

function openNewColectivo() {
  editingColectivo.value = null;
  colectivoForm.value = { nombre: '', color: '#68c67c' };
  showColectivoForm.value = true;
  colectivoMsg.value = { text: '', type: '' };
}

function openEditColectivo(c) {
  editingColectivo.value = c;
  colectivoForm.value = { nombre: c.nombre, color: c.color };
  showColectivoForm.value = true;
  colectivoMsg.value = { text: '', type: '' };
}

async function saveColectivo() {
  colectivoMsg.value = { text: '', type: '' };
  if (!colectivoForm.value.nombre.trim()) {
    colectivoMsg.value = { text: 'El nombre es obligatorio', type: 'error' };
    return;
  }
  try {
    const url = editingColectivo.value
      ? `/api/admin/colectivos/${editingColectivo.value.id}`
      : '/api/admin/colectivos';
    const method = editingColectivo.value ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(colectivoForm.value),
    });
    const data = await res.json();
    if (res.ok) {
      colectivoMsg.value = { text: editingColectivo.value ? 'Colectivo actualizado' : 'Colectivo creado', type: 'ok' };
      showColectivoForm.value = false;
      loadColectivos();
    } else {
      colectivoMsg.value = { text: data.error || 'Error', type: 'error' };
    }
  } catch (e) {
    colectivoMsg.value = { text: 'Error de conexion', type: 'error' };
  }
}

async function deleteColectivo(id) {
  if (!confirm('Eliminar este colectivo?')) return;
  try {
    const res = await fetch(`/api/admin/colectivos/${id}`, { method: 'DELETE' });
    if (res.ok) loadColectivos();
  } catch (e) {}
}

onMounted(checkAuth);
</script>

<template>
  <div class="max-w-lg mx-auto">
    <div v-if="loadingAuth" class="space-y-4">
      <div class="h-8 w-32 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse mx-auto"></div>
      <div class="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6 space-y-4">
        <div class="space-y-1">
          <div class="h-4 w-16 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
          <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        </div>
        <div class="space-y-1">
          <div class="h-4 w-24 rounded bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
          <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
        </div>
        <div class="h-10 w-full rounded-lg bg-stone-200 dark:bg-stone-700 skeleton-pulse"></div>
      </div>
    </div>

    <div v-else-if="!isLoggedIn">
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6 text-center">Admin</h1>
      <form @submit.prevent="login" class="space-y-4 bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Usuario</label>
          <input v-model="username" type="text" required autocomplete="username"
            class="w-full rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Contrasena</label>
          <input v-model="password" type="password" required autocomplete="current-password"
            class="w-full rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none" />
        </div>
        <p v-if="error" class="text-sm text-[#fe7763]">{{ error }}</p>
        <button type="submit" class="w-full bg-[#2b5740] hover:bg-[#1e3d2c] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer">
          Iniciar sesion
        </button>
      </form>
    </div>

    <div v-else>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100">Panel Admin</h1>
        <button @click="logout" class="text-sm bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
          Cerrar sesion
        </button>
      </div>

      <!-- Colectivos -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100">Colectivos</h2>
          <button @click="openNewColectivo" class="text-sm bg-[#2b5740] hover:bg-[#1e3d2c] text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">+ Nuevo</button>
        </div>

        <!-- Colectivo form -->
        <div v-if="showColectivoForm" class="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-4 mb-4">
          <h3 class="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">{{ editingColectivo ? 'Editar Colectivo' : 'Nuevo Colectivo' }}</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Nombre *</label>
              <input v-model="colectivoForm.nombre" type="text" placeholder="Ej: Paquerxs del Parkway"
                class="w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm dark:bg-stone-900 dark:text-stone-200 focus:ring-2 focus:ring-[#68c67c] focus:border-[#68c67c] outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Color</label>
              <div class="flex items-center gap-2 flex-wrap">
                <button v-for="c in presetColors" :key="c" @click="colectivoForm.color = c"
                  :class="['w-8 h-8 rounded-full border-2 transition-all cursor-pointer', colectivoForm.color === c ? 'border-stone-800 dark:border-stone-100 scale-110' : 'border-transparent']"
                  :style="{ backgroundColor: c }" type="button" />
                <input v-model="colectivoForm.color" type="color" class="w-8 h-8 rounded cursor-pointer" />
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="saveColectivo" class="bg-[#2b5740] hover:bg-[#1e3d2c] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                {{ editingColectivo ? 'Guardar' : 'Crear' }}
              </button>
              <button @click="showColectivoForm = false" class="bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer">
                Cancelar
              </button>
            </div>
          </div>
          <p v-if="colectivoMsg.text" :class="['text-xs mt-2', colectivoMsg.type === 'ok' ? 'text-[#2b5740] dark:text-[#68c67c]' : 'text-[#fe7763]']">
            {{ colectivoMsg.text }}
          </p>
        </div>

        <!-- Colectivos list -->
        <div class="space-y-2">
          <div v-for="c in colectivos" :key="c.id" class="flex items-center gap-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3">
            <span class="w-4 h-4 rounded-full flex-shrink-0" :style="{ backgroundColor: c.color }"></span>
            <span class="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200">{{ c.nombre }}</span>
            <button @click="openEditColectivo(c)" class="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer">Editar</button>
            <button @click="deleteColectivo(c.id)" class="text-xs text-[#fe7763] hover:text-[#a63526] cursor-pointer">Eliminar</button>
          </div>
          <p v-if="colectivos.length === 0" class="text-sm text-stone-400 dark:text-stone-500 text-center py-4">No hay colectivos registrados</p>
        </div>
      </div>

      <!-- Usuarios -->
      <div class="mb-8">
        <h2 class="text-lg font-bold text-stone-800 dark:text-stone-100 mb-3">Usuarios</h2>
        <div class="space-y-2">
          <div v-for="u in users" :key="u.id" class="flex items-center gap-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3">
            <span class="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200">{{ u.username }}</span>
            <span class="text-xs text-stone-400">{{ u.created_at }}</span>
          </div>
          <p v-if="users.length === 0" class="text-sm text-stone-400 dark:text-stone-500 text-center py-4">No hay usuarios</p>
        </div>
      </div>

      <p class="text-stone-500 dark:text-stone-400 text-sm">Puedes eliminar pacas desde el <router-link to="/pacas" class="text-[#2b5740] dark:text-[#5dd4be] hover:underline">inventario</router-link>.</p>
    </div>
  </div>
</template>
