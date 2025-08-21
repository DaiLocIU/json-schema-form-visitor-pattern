import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import DynamicValueInputTest from '../views/DynamicValueInputTest.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/dynamic-input-test',
    name: 'DynamicInputTest',
    component: DynamicValueInputTest
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
