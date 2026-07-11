<script setup>
import { ref, onMounted } from 'vue';

const isLoggedIn = ref(false);
const username = ref('');
const password = ref('');
const error = ref('');

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    isLoggedIn.value = data.admin;
  } catch (e) {}
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

onMounted(checkAuth);
</script>

<template>
  <div class="max-w-sm mx-auto mt-8 sm:mt-16">
    <div v-if="!isLoggedIn">
      <h1 class="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-6 text-center">Admin</h1>
      <form @submit.prevent="login" class="space-y-4 bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Usuario</label>
          <input v-model="username" type="text" required autocomplete="username"
            class="w-full rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Contrasena</label>
          <input v-model="password" type="password" required autocomplete="current-password"
            class="w-full rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 border px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
        </div>
        <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer">
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
      <p class="text-stone-500 dark:text-stone-400 text-sm mb-4">Puedes eliminar pacas desde el <router-link to="/pacas" class="text-emerald-600 dark:text-emerald-400 hover:underline">inventario</router-link>.</p>
    </div>
  </div>
</template>
