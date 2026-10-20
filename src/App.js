import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';

const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Browse = lazy(() => import('./pages/Browse'));
const Listing = lazy(() => import('./pages/Listing'));
const Rentals = lazy(() => import('./pages/Rentals'));
const Shop = lazy(() => import('./pages/Shop'));
const Admin = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<main className="loading-screen" aria-label="Loading SwapSpot"><span className="loading-mark">S</span></main>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/listing" element={<Listing />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
