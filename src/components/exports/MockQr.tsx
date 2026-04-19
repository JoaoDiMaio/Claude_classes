'use client';

import React, { useMemo } from 'react';

export function MockQr({ token }: { token: string }) {
  const bits = useMemo(() => {
    const seed = token.split('').reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 5381);
    const size = 21;
    const cells: boolean[] = [];
    let x = seed;
    for (let i = 0; i < size * size; i += 1) {
      x = (1103515245 * x + 12345) & 0x7fffffff;
      cells.push((x % 7) < 3);
    }
    return { size, cells };
  }, [token]);

  const cell = 6;
  const pad = 8;
  const w = bits.size * cell + pad * 2;

  return (
    <svg width={w} height={w} viewBox={`0 0 ${w} ${w}`} className="rounded-xl border border-slate-200 bg-white">
      <rect x="0" y="0" width={w} height={w} fill="white" />
      <g transform={`translate(${pad} ${pad})`}>
        {bits.cells.map((on, idx) => {
          if (!on) return null;
          const x = (idx % bits.size) * cell;
          const y = Math.floor(idx / bits.size) * cell;
          return <rect key={idx} x={x} y={y} width={cell} height={cell} fill="#0f172a" opacity="0.92" />;
        })}
      </g>
    </svg>
  );
}

