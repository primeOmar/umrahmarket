import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* Required for every toast.success/toast.error in the app to be visible.
        Without it, validation errors (e.g. on "Create Task") were silently
        swallowed and buttons looked unresponsive. */}
    <Toaster position="top-right" toastOptions={{ duration: 5000 }} containerStyle={{ zIndex: 9999 }} />
  </StrictMode>,
)
