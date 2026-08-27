import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import ForumView from './views/ForumView.vue'
import OverviewView from './views/OverviewView.vue'
import TaskDetailView from './views/TaskDetailView.vue'
import EvaluationView from './views/EvaluationView.vue'
import './styles.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'control-plane-overview', component: OverviewView },
    { path: '/forum', name: 'forum-home', component: ForumView, meta: { layout: 'forum' } },
    { path: '/tasks/:taskId', name: 'task-detail', component: TaskDetailView, props: true },
    { path: '/evaluation', name: 'evaluation', component: EvaluationView }
  ]
})

createApp(App).use(router).mount('#app')
