import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 触发根节点淡入：setTimeout 确保在首次渲染之后
setTimeout(() => document.getElementById('root')?.classList.add('entered'), 0)
