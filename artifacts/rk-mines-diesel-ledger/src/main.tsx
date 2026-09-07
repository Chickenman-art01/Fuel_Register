import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { getSupabaseAccessToken, supabase } from '@/lib/supabase';

import './index.css';

setBaseUrl(
  import.meta.env.VITE_API_URL ??
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
);
setAuthTokenGetter(getSupabaseAccessToken);

supabase.auth.onAuthStateChange(() => undefined);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
