import { createRouter, createWebHistory } from 'vue-router';

import MapaView from '../views/MapaView.vue';
import PacasView from '../views/PacasView.vue';
import FormularioView from '../views/FormularioView.vue';
import AdminView from '../views/AdminView.vue';
import AboutView from '../views/AboutView.vue';
import TerminosView from '../views/TerminosView.vue';

const routes = [
  { path: '/', name: 'mapa', component: MapaView, meta: { title: 'Mapa' } },
  { path: '/pacas', name: 'pacas', component: PacasView, meta: { title: 'Inventario' } },
  { path: '/formulario', name: 'formulario', component: FormularioView, meta: { title: 'Registrar' } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { title: 'Admin' } },
  { path: '/about', name: 'about', component: AboutView, meta: { title: 'About' } },
  { path: '/terminos', name: 'terminos', component: TerminosView, meta: { title: 'Terminos' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | Paquerxs` : 'Paquerxs';
});

export default router;
