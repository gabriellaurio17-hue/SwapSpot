import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AuthProvider, ROLES, useAuth } from './context/AuthContext';
import ReportNotifications from './components/ReportNotifications';

const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Browse = lazy(() => import('./pages/Browse'));
const Listing = lazy(() => import('./pages/Listing'));
const Messages = lazy(() => import('./pages/Messages'));
const Rentals = lazy(() => import('./pages/Rentals'));
const Shop = lazy(() => import('./pages/Shop'));
const ShopApply = lazy(() => import('./pages/ShopApply'));
const Admin = lazy(() => import('./pages/Admin'));
const ShopOwner = lazy(() => import('./pages/ShopOwner'));
const ShopOwnerInventoryForm = lazy(() => import('./pages/ShopOwnerInventoryForm'));
const Profile = lazy(() => import('./pages/Profile'));
const CreateListing = lazy(() => import('./pages/CreateListing'));

function RoleRoute({ children, role: requiredRole }) {
  const { role: currentRole, loading } = useAuth();

  if (loading) {
    return <main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>;
  }

  // TODO: Enforce this role check in the ASP.NET Core API and Supabase RLS too.
  return currentRole === requiredRole
    ? children
    : <Navigate to="/" replace state={{ accessDenied: true }} />;
}

function NonVisitorRoute({ children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>;
  }

  return role !== ROLES.visitor
    ? children
    : <Navigate to="/" replace state={{ accessDenied: true }} />;
}

function VerifiedRoute({ children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>;
  }

  return role === ROLES.verified
    ? children
    : <Navigate to="/" replace state={{ accessDenied: true }} />;
}

function VerifiedOrShopOwnerRoute({ children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>;
  }

  return role === ROLES.verified || role === ROLES.shopOwner
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

function SuspendedAccountNotice() {
  const { user, signOut } = useAuth();

  return (
    <main className="container" style={{ paddingBlock: 40 }}>
      <section className="dash-attention" role="alert">
        <span className="dash-attention-icon" aria-hidden="true">!</span>
        <div><strong>Your account is suspended.</strong><span>Review the admin update below for details.</span></div>
      </section>
      <ReportNotifications userId={user?.id} />
      <button type="button" className="btn btn-secondary" onClick={signOut}>Log out</button>
    </main>
  );
}

function AppInner() {
  const { role, loading } = useAuth();

  if (loading) {
    return <main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>;
  }

  if (role === ROLES.suspended) return <SuspendedAccountNotice />;

  return (
    <>
      <AccessDeniedNotice />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/listing" element={<VerifiedRoute><Listing /></VerifiedRoute>} />
        <Route path="/messages" element={<VerifiedOrShopOwnerRoute><Messages /></VerifiedOrShopOwnerRoute>} />
        <Route path="/sell" element={<VerifiedRoute><CreateListing /></VerifiedRoute>} />
        <Route path="/rentals" element={<VerifiedRoute><Rentals /></VerifiedRoute>} />
        <Route path="/shop" element={<VerifiedRoute><Shop /></VerifiedRoute>} />
        <Route path="/shop/apply" element={<VerifiedRoute><ShopApply /></VerifiedRoute>} />
        <Route path="/admin" element={<RoleRoute role={ROLES.admin}><Admin /></RoleRoute>} />
        <Route path="/shop-owner/inventory/new" element={<RoleRoute role={ROLES.shopOwner}><ShopOwnerInventoryForm mode="add" /></RoleRoute>} />
        <Route path="/shop-owner/inventory/:itemId/edit" element={<RoleRoute role={ROLES.shopOwner}><ShopOwnerInventoryForm mode="edit" /></RoleRoute>} />
        <Route path="/shop-owner" element={<RoleRoute role={ROLES.shopOwner}><ShopOwner /></RoleRoute>} />
        <Route path="/profile" element={<NonVisitorRoute><Profile /></NonVisitorRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>}>
          <AppInner />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;