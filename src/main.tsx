import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppErrorNotifications } from './components/AppErrorNotifications';
import { installGlobalErrorHandlers } from './utils/errorReporting';
import './index.css';
import 'katex/dist/katex.min.css';

installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
    <AppErrorNotifications />
  </>,
);
