import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';

const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Browse = lazy(() => import('./pages/Browse'));
const Listing = lazy(() => import('./pages/Listing'));
const Rentals = lazy(() => import('./pages/Rentals'));
const Shop = lazy(() => import('./pages/Shop'));
const Admin = lazy(() => import('./pages/Admin'));
const ShopOwner = lazy(() => import('./pages/ShopOwner'));
const ShopOwnerInventoryForm = lazy(() => import('./pages/ShopOwnerInventoryForm'));

function RoleRoute({ children, role }) {
  const { role: currentRole } = useAuth();

  // TODO: Enforce this role check in the ASP.NET Core API and Supabase RLS too.
  return currentRole === role
    ? children
    : <Navigate to="/" replace state={{ accessDenied: true }} />;
}

function NonVisitorRoute({ children }) {
  const { role } = useAuth();

  return role !== ROLES.visitor
    ? children
    : <Navigate to="/" replace state={{ accessDenied: true }} />;
}

function AccessDeniedNotice() {
  const location = useLocation();
  const [dismissed, setDismissed] = React.useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [location.key]);

  if (location.pathname !== '/' || !location.state?.accessDenied || dismissed) {
    return null;
  }

  return (
    <div className="dash-access-notice" role="alert">
      <span>You don’t have access to this page.</span>
      <button type="button" aria-label="Dismiss access message" onClick={() => setDismissed(true)}>×</button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>}>
          <AccessDeniedNotice />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/listing" element={<NonVisitorRoute><Listing /></NonVisitorRoute>} />
            <Route path="/rentals" element={<NonVisitorRoute><Rentals /></NonVisitorRoute>} />
            <Route path="/shop" element={<NonVisitorRoute><Shop /></NonVisitorRoute>} />
            <Route path="/admin" element={<RoleRoute role={ROLES.admin}><Admin /></RoleRoute>} />
            <Route path="/shop-owner/inventory/new" element={<RoleRoute role={ROLES.shopOwner}><ShopOwnerInventoryForm mode="add" /></RoleRoute>} />
            <Route path="/shop-owner/inventory/:itemId/edit" element={<RoleRoute role={ROLES.shopOwner}><ShopOwnerInventoryForm mode="edit" /></RoleRoute>} />
            <Route path="/shop-owner" element={<RoleRoute role={ROLES.shopOwner}><ShopOwner /></RoleRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
