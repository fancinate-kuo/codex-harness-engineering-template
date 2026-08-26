import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import OverviewView from './views/OverviewView.vue'
import TaskDetailView from './views/TaskDetailView.vue'
import EvaluationView from './views/EvaluationView.vue'
import './styles.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: OverviewView },
    { path: '/tasks/:taskId', component: TaskDetailView, props: true },
    { path: '/evaluation', component: EvaluationView }
  ]
})

createApp(App).use(router).mount('#app')
