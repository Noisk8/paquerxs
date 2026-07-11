<script setup>
import { ref, onMounted } from 'vue';

const showBanner = ref(false);
const deferredPrompt = ref(null);

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    if (!localStorage.getItem('pwa-dismissed')) {
      showBanner.value = true;
    }
  });

  window.addEventListener('appinstalled', () => {
    showBanner.value = false;
    deferredPrompt.value = null;
  });
});

async function install() {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === 'accepted') {
    showBanner.value = false;
  }
  deferredPrompt.value = null;
}

function dismiss() {
  showBanner.value = false;
  localStorage.setItem('pwa-dismissed', '1');
}
</script>

<template>
  <div v-if="showBanner" class="fixed bottom-0 inset-x-0 z-50 p-4">
    <div class="max-w-md mx-auto bg-emerald-700 dark:bg-emerald-800 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3">
      <img src="/icons/paca.png" alt="" class="w-10 h-10 rounded-lg" />
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">Instalar Paquerxs</p>
        <p class="text-emerald-100 text-xs">Acceso rapido desde tu pantalla de inicio</p>
      </div>
      <button @click="install" class="bg-white text-emerald-800 font-semibold text-xs px-3 py-1.5 rounded-lg cursor-pointer">Instalar</button>
      <button @click="dismiss" class="text-emerald-200 hover:text-white text-xs cursor-pointer">X</button>
    </div>
  </div>
</template>
