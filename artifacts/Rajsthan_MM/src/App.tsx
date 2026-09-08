import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthGate, useAppRole } from '@/components/auth-gate';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import FuelRegister from '@/pages/FuelRegister';
import ControlPanal from '@/pages/ControlPanal';
import Vehicles from '@/pages/Vehicles';
import Users from '@/pages/Users';
import Employees from '@/pages/Employees';
import Dropdowns from '@/pages/Dropdowns';
import {
  Route,
  Switch,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const role = useAppRole();
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/">
          {role === 'commander' ? <Redirect to="/controlpanal" replace /> : <FuelRegister />}
        </Route>
        <Route path="/Fuelentry" component={FuelRegister} />
        <Route path="/fuelregister">
          <Redirect to="/Fuelentry" replace />
        </Route>
        <Route path="/controlpanal">
          {role === 'commander' ? <ControlPanal /> : <Redirect to="/Fuelentry" replace />}
        </Route>
        <Route path="/vehicles">
          <Vehicles />
        </Route>
        <Route path="/vahicles">
          <Redirect to="/vehicles" replace />
        </Route>
        <Route path="/users">
          {role === 'commander' ? <Users /> : <Redirect to="/Fuelentry" replace />}
        </Route>
        <Route path="/employees">
          {role === 'commander' ? <Employees /> : <Redirect to="/Fuelentry" replace />}
        </Route>
        <Route path="/dropdowns">
          {role === 'commander' ? <Dropdowns /> : <Redirect to="/Fuelentry" replace />}
        </Route>
        <Route path="/dropdown">
          <Redirect to="/dropdowns" replace />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <AuthGate>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthGate>
  );
}

export default App;
