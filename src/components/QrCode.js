import React from 'react';

const cells = [
  [0, 0, 7, 7], [1, 1, 5, 5], [2, 2, 3, 3], [14, 0, 7, 7], [15, 1, 5, 5], [16, 2, 3, 3],
  [0, 14, 7, 7], [1, 15, 5, 5], [2, 16, 3, 3], [8, 0, 1, 1], [10, 1, 1, 1], [8, 3, 2, 1],
  [11, 4, 1, 1], [7, 7, 2, 2], [10, 7, 1, 1], [13, 8, 2, 1], [8, 10, 1, 2], [10, 10, 2, 1],
  [12, 11, 1, 2], [7, 13, 2, 1], [9, 14, 1, 2], [11, 15, 2, 1], [14, 11, 1, 2], [16, 14, 1, 2],
  [18, 10, 2, 1], [18, 13, 1, 2], [4, 9, 1, 2], [6, 11, 1, 1], [3, 12, 2, 1], [5, 16, 1, 2],
  [7, 18, 2, 1], [11, 18, 2, 1],
];

function QrCode({ label = 'Sample GCash QR code' }) {
  return <svg className="qr-code" viewBox="0 0 21 21" role="img" aria-label={label}><rect width="21" height="21" fill="#fff" />{cells.map(([x, y, width, height], index) => <rect key={`${x}-${y}-${index}`} x={x} y={y} width={width} height={height} fill="#25120f" />)}</svg>;
}

export default React.memo(QrCode);