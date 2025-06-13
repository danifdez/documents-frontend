import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import Project from '../pages/Project.vue'
import Thread from '../pages/Thread.vue'
import Doc from '../pages/Doc.vue'
import BrowserToolbar from '../pages/BrowserToolbar.vue'
import Resource from '../pages/Resource.vue'
import Settings from '../pages/Settings.vue'

const routes = [
  {
    path: '/',
    component: Dashboard
  },
  {
    path: '/project/:id',
    component: Project
  },
  {
    path: '/thread/:id',
    component: Thread
  },
  {
    path: '/document/:id',
    component: Doc
  },
  {
    path: '/browser-toolbar',
    name: 'BrowserToolbar',
    component: BrowserToolbar,
  },
  {
    path: '/resource/:id',
    name: 'Resource',
    component: Resource,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})