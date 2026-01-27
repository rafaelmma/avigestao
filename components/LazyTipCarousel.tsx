import React, { Suspense, lazy } from 'react';

const TipCarousel = lazy(() => import('./TipCarousel'));

type TipCategory = 'dashboard' | 'birds' | 'breeding' | 'meds' | 'finance' | 'movements' | 'tasks' | 'tournaments' | 'settings';

const LazyTipCarousel: React.FC<{ category?: TipCategory }> = ({ category = 'dashboard' }) => (
  <Suspense fallback={<div className="h-12" />}> 
    <TipCarousel category={category} />
  </Suspense>
);

export default LazyTipCarousel;
