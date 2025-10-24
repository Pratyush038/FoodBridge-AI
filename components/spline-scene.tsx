'use client';

import Spline from '@splinetool/react-spline/next';

export default function SplineScene() {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: '200%', height: '200%' }}>
          <Spline
            scene="https://prod.spline.design/BRrwzeppAfVY8a7r/scene.splinecode"
            style={{
              width: '100%',
              height: '100%',
              transform: 'translate(-25%, -25%)'
            }}
          />
        </div>
      </div>
    </div>
  );
}
