import React, { Suspense, lazy } from 'react';

const TipCarousel = lazy(() => import('./TipCarousel'));

const LazyTipCarousel: React.FC<{ category?: string }> = (props) => (
  <Suspense fallback={<div className="h-12" />}> 
    <TipCarousel {...props} />
  </Suspense>
);

export default LazyTipCarousel;
