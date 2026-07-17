<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import ThemeToggle from './components/ThemeToggle.vue';

const route = useRoute();
const menuOpen = ref(false);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}
</script>

<template>
  <nav class="bg-emerald-800 dark:bg-emerald-900 text-white shadow-lg relative z-50">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <router-link to="/" class="text-lg sm:text-xl font-bold tracking-tight hover:text-emerald-200 transition-colors" @click="closeMenu">
        Wiki Paquera
      </router-link>
      <div class="flex items-center gap-1">
        <ThemeToggle />
        <button class="sm:hidden p-2 rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer" @click="toggleMenu" aria-label="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="hidden sm:flex gap-1 text-sm">
          <router-link to="/" class="px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors" active-class="bg-emerald-700">Mapa</router-link>
          <router-link to="/pacas" class="px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors" active-class="bg-emerald-700">Pacas</router-link>
          <router-link to="/colectivos" class="px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors" active-class="bg-emerald-700">Colectivos</router-link>
          <router-link to="/formulario" class="px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors" active-class="bg-emerald-700">Registrar</router-link>
          <router-link to="/about" class="px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors" active-class="bg-emerald-700">About</router-link>
          <router-link to="/admin" class="px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors" active-class="bg-emerald-700">Admin</router-link>
        </div>
      </div>
    </div>
    <div v-if="menuOpen" class="sm:hidden border-t border-emerald-700 px-4 pb-3">
      <router-link to="/" class="block py-2 hover:text-emerald-200 transition-colors" @click="closeMenu">Mapa</router-link>
      <router-link to="/pacas" class="block py-2 hover:text-emerald-200 transition-colors" @click="closeMenu">Pacas</router-link>
      <router-link to="/colectivos" class="block py-2 hover:text-emerald-200 transition-colors" @click="closeMenu">Colectivos</router-link>
      <router-link to="/formulario" class="block py-2 hover:text-emerald-200 transition-colors" @click="closeMenu">Registrar</router-link>
      <router-link to="/about" class="block py-2 hover:text-emerald-200 transition-colors" @click="closeMenu">About</router-link>
      <router-link to="/admin" class="block py-2 hover:text-emerald-200 transition-colors" @click="closeMenu">Admin</router-link>
    </div>
  </nav>

  <main class="max-w-6xl mx-auto px-4 py-6 sm:py-8 w-full flex-1">
    <router-view />
  </main>

  <footer class="bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-center py-4 text-xs sm:text-sm transition-colors">
    <router-link to="/terminos" class="hover:text-[#ffcd6e] dark:hover:text-[#ffcd6e] transition-colors">Terminos de Uso</router-link>
    &middot;
    Paquerxs Teusaquillo &middot; Monitoreo de Pacas
  </footer>

  <PWAInstall />
</template>

<script>
import PWAInstall from './components/PWAInstall.vue';

export default {
  components: { PWAInstall },
};
</script>
