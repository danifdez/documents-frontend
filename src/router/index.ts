import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import Project from '../pages/Project.vue'
import Thread from '../pages/Thread.vue'
import Doc from '../pages/Doc.vue'
import BrowserToolbar from '../pages/BrowserToolbar.vue'
import BrowserPage from '../pages/BrowserPage.vue'
import Resource from '../pages/Resource.vue'
import Settings from '../pages/Settings.vue'
import Relationships from '../pages/Relationships.vue'
import Canvas from '../pages/Canvas.vue'
import Datasets from '../pages/Datasets.vue'
import Dataset from '../pages/Dataset.vue'
import Calendar from '../pages/Calendar.vue'
import Timeline from '../pages/Timeline.vue'
import KnowledgeBase from '../pages/KnowledgeBase.vue'
import KnowledgeEntryEdit from '../pages/KnowledgeEntryEdit.vue'
import Bibliography from '../pages/Bibliography.vue'
import Login from '../pages/Login.vue'
import UserManagement from '../pages/UserManagement.vue'
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { public: true }
  },
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
    path: '/browser/:id?',
    name: 'BrowserPage',
    component: BrowserPage,
  },
  {
    path: '/resource/:id',
    name: 'Resource',
    component: Resource,
  },
  {
    path: '/canvas/:id',
    name: 'Canvas',
    component: Canvas,
    meta: { feature: 'canvas' },
  },
  {
    path: '/relationships',
    name: 'Relationships',
    component: Relationships,
    meta: { feature: 'relationships' },
  },
  {
    path: '/entities',
    redirect: '/relationships',
  },
  {
    path: '/project/:id/relationships',
    name: 'ProjectRelationships',
    redirect: (to: any) => ({ path: '/relationships', query: { tab: 'relationships', project: to.params.id } }),
    meta: { feature: 'relationships' },
  },
  {
    path: '/datasets',
    name: 'Datasets',
    component: Datasets,
    meta: { feature: 'datasets' },
  },
  {
    path: '/datasets/:id',
    name: 'Dataset',
    component: Dataset,
    meta: { feature: 'datasets' },
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: Calendar,
    meta: { feature: 'calendar' },
  },
  {
    path: '/project/:id/calendar',
    name: 'ProjectCalendar',
    component: Calendar,
    meta: { feature: 'calendar' },
  },
  {
    path: '/timeline/:id',
    name: 'Timeline',
    component: Timeline,
    meta: { feature: 'timelines' },
  },
  {
    path: '/knowledge-base',
    name: 'KnowledgeBase',
    component: KnowledgeBase,
    meta: { feature: 'knowledge_base' },
  },
  {
    path: '/knowledge-base/:id',
    name: 'KnowledgeEntryEdit',
    component: KnowledgeEntryEdit,
    meta: { feature: 'knowledge_base' },
  },
{
    path: '/settings',
    name: 'Settings',
    component: Settings,
  },
  {
    path: '/bibliography',
    name: 'Bibliography',
    component: Bibliography,
    meta: { feature: 'bibliography' },
  },
  {
    path: '/project/:id/bibliography',
    name: 'ProjectBibliography',
    component: Bibliography,
    meta: { feature: 'bibliography' },
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: { requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('../store/authStore')
  const authStore = useAuthStore()

  if (!authStore.initialized) {
    await authStore.checkAuthStatus()
  }

  // Feature flag guard
  if (to.meta?.feature) {
    const { useFeatureStore } = await import('../store/featureStore')
    const featureStore = useFeatureStore()
    if (!featureStore.isEnabled(to.meta.feature as string)) {
      return { path: '/' }
    }
  }

  // No auth required — pass through
  if (!authStore.authRequired) return true

  // Public routes (login)
  if (to.meta?.public) return true

  // Not authenticated — redirect to login
  if (!authStore.isAuthenticated) {
    return { name: 'Login' }
  }

  // Admin-only routes
  if (to.meta?.requiresAdmin && !authStore.isAdmin) {
    return { path: '/' }
  }

  return true
})

export default router
