import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import Project from '../pages/Project.vue'
import Thread from '../pages/Thread.vue'
import Doc from '../pages/Doc.vue'
import BrowserToolbar from '../pages/BrowserToolbar.vue'
import ResourceDetail from '../pages/ResourceDetail.vue'

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
    name: 'ResourceDetail',
    component: ResourceDetail,
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})