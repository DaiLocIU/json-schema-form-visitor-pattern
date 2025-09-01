import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import DynamicValueInputTest from '../views/DynamicValueInputTest.vue'
import ResponsiveHoverButton from '../views/ResponsiveHoverButton.vue'
import ResponsiveHoverButtonTest from '../views/ResponsiveHoverButtonTest.vue'

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
  },
  {
    path: '/responsive-hover-button',
    name: 'ResponsiveHoverButton',
    component: ResponsiveHoverButton
  }
  ,
  {
    path: '/responsive-hover-button-test',
    name: 'ResponsiveHoverButtonTest',
    component: ResponsiveHoverButtonTest
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
