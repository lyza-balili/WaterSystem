import React from "react";

export function QrPattern({ size = 132 }) {
  const cells = 21;
  const seed = 1234567;
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const cellSize = size / cells;
  const finderSize = cellSize * 7;
  const dots = [];

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const inTopLeft = r < 7 && c < 7;
      const inTopRight = r < 7 && c >= cells - 7;
      const inBottomLeft = r >= cells - 7 && c < 7;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      if (rand() > 0.55) dots.push([r, c]);
    }
  }

  function Finder({ x, y }) {
    return (
      <g transform={`translate(${x},${y})`}>
        <rect width={finderSize} height={finderSize} fill="#0f172a" rx="2" />
        <rect x={cellSize} y={cellSize} width={finderSize - 2 * cellSize} height={finderSize - 2 * cellSize} fill="#fff" />
        <rect x={cellSize * 2} y={cellSize * 2} width={finderSize - 4 * cellSize} height={finderSize - 4 * cellSize} fill="#0f172a" rx="1" />
      </g>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded">
      <rect width={size} height={size} fill="#fff" />
      {dots.map(([r, c], i) => (
        <rect key={i} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#0f172a" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={size - finderSize} y={0} />
      <Finder x={0} y={size - finderSize} />
    </svg>
  );
}
