import { createRouter, createWebHistory } from 'vue-router';

import MapaView from '../views/MapaView.vue';
import PacasView from '../views/PacasView.vue';
import PacaDetailView from '../views/PacaDetailView.vue';
import FormularioView from '../views/FormularioView.vue';
import MedicionView from '../views/MedicionView.vue';
import ColectivosView from '../views/ColectivosView.vue';
import ColectivoDetailView from '../views/ColectivoDetailView.vue';
import AdminView from '../views/AdminView.vue';
import AboutView from '../views/AboutView.vue';
import TerminosView from '../views/TerminosView.vue';

const routes = [
  { path: '/', name: 'mapa', component: MapaView, meta: { title: 'Mapa' } },
  { path: '/pacas', name: 'pacas', component: PacasView, meta: { title: 'Inventario' } },
  { path: '/paca/:id', name: 'paca-detail', component: PacaDetailView, meta: { title: 'Paca' } },
  { path: '/formulario', name: 'formulario', component: FormularioView, meta: { title: 'Registrar' } },
  { path: '/medicion', name: 'medicion', component: MedicionView, meta: { title: 'Medicion' } },
  { path: '/colectivos', name: 'colectivos', component: ColectivosView, meta: { title: 'Colectivos' } },
  { path: '/colectivo/:nombre', name: 'colectivo-detail', component: ColectivoDetailView, meta: { title: 'Colectivo' } },
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
  document.title = to.meta.title ? `${to.meta.title} | Wiki Paquera` : 'Wiki Paquera';
});

export default router;
