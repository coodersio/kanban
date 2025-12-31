import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 全局设置：确保所有fetch请求都包含credentials以支持session cookie
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  return originalFetch(input, {
    ...init,
    credentials: init?.credentials || 'include', // 默认包含credentials
  });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
