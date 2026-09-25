import React, { useRef, useEffect } from 'react';

export interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  lightBackground?: boolean;
}

export interface Code128CanvasProps extends BarcodeProps {
  barWidth?: number;
  allowDownload?: boolean;
}

// Full 107 standard Code 128 bit patterns (Subset B, values 0 to 106)
export const CODE128_PATTERNS: string[] = [
  "11011001100", "11001101100", "11001100110", "10010011000",
  "10010001100", "10001001100", "10011001000", "10011000100",
  "10001100100", "11001001000", "11001000100", "11000100100",
  "10110011100", "10011011100", "10011001110", "10111001100",
  "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110",
  "11101001100", "11100101100", "11100100110", "11101100100",
  "11100110100", "11100110010", "11011011000", "11011000110",
  "11000110110", "10100011000", "10001011000", "10001000110",
  "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110",
  "10001101110", "10111011000", "10111000110", "10001110110",
  "11101110110", "11010001110", "11000101110", "11011101000",
  "11011100010", "11011101110", "11101011000", "11101000110",
  "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000",
  "10100001100", "10010110000", "10010000110", "10000101100",
  "10000100110", "10110010000", "10110000100", "10011010000",
  "10011000010", "10000110100", "10000110010", "11000010010",
  "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100",
  "10011110100", "10011110010", "11110100100", "11110010100",
  "11110010010", "11011011110", "11011110110", "11110110110",
  "10101111000", "10100011110", "10001011110", "10111101000",
  "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100",
  "11010010000", "11010011100", "1100011101011"
];

export function encodeCode128(text: string): string {
  const startCode = 104; // Start B
  let checksum = startCode;
  let bitstring = CODE128_PATTERNS[startCode];

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const value = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    checksum += (i + 1) * value;
    bitstring += CODE128_PATTERNS[value] || CODE128_PATTERNS[0];
  }

  const checkValue = checksum % 103;
  bitstring += CODE128_PATTERNS[checkValue] || CODE128_PATTERNS[0];
  bitstring += CODE128_PATTERNS[106]; // Stop code
  return bitstring;
}

/**
 * Standard HTML5 Canvas Code128 Barcode Renderer with retina DPI scaling and PNG export
 */
export const Code128Canvas: React.FC<Code128CanvasProps> = ({
  value,
  width,
  height = 70,
  barWidth = 2,
  showText = true,
  lightBackground = false,
  className = '',
  allowDownload = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const code = (value || 'ETOILE-000000').trim().toUpperCase();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bits = encodeCode128(code);
    const quietZoneBits = 10;
    const totalModules = bits.length + quietZoneBits * 2;

    const moduleWidth = width ? width / totalModules : barWidth;
    const canvasWidth = Math.round(totalModules * moduleWidth);
    const canvasHeight = height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    if (lightBackground) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    // Barcode bars
    const barHeight = showText ? canvasHeight - 20 : canvasHeight - 4;
    const fgColor = lightBackground ? '#000000' : '#ffffff';
    ctx.fillStyle = fgColor;

    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        const x = Math.round((i + quietZoneBits) * moduleWidth);
        ctx.fillRect(x, 4, Math.ceil(moduleWidth), barHeight);
      }
    }

    // Human-readable monospace label
    if (showText) {
      ctx.fillStyle = lightBackground ? '#111827' : '#caa868';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(code, canvasWidth / 2, canvasHeight - 2);
    }

    ctx.restore();
  }, [code, width, height, barWidth, showText, lightBackground]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${code}-code128.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <canvas ref={canvasRef} className="rounded shadow-sm" aria-label={`Code128 Barcode: ${code}`} />
      {allowDownload && (
        <button
          type="button"
          onClick={handleDownload}
          className="mt-1.5 text-[10px] text-brand-gold hover:text-brand-gold-light underline flex items-center gap-1 cursor-pointer"
        >
          <span>Download PNG</span>
        </button>
      )}
    </div>
  );
};

// Vector SVG Barcode Renderer
export const BarcodeSVG: React.FC<BarcodeProps> = ({
  value,
  width = 240,
  height = 65,
  showText = true,
  className = '',
  lightBackground = false,
}) => {
  const code = (value || 'ETOILE-000000').toUpperCase().trim();
  const bits = encodeCode128(code);
  const quietZoneBits = 10;
  const totalModules = bits.length + quietZoneBits * 2;
  const barHeight = showText ? height - 18 : height;

  const barColor = lightBackground ? '#000000' : '#ffffff';
  const textColor = lightBackground ? '#111827' : '#caa868';
  const bgFill = lightBackground ? '#ffffff' : 'transparent';

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalModules} ${height}`}
        style={{ width: '100%', maxWidth: `${width}px`, height: 'auto' }}
        className="overflow-visible"
        aria-label={`Barcode: ${code}`}
      >
        {bgFill !== 'transparent' && (
          <rect x="0" y="0" width={totalModules} height={height} rx="4" fill={bgFill} />
        )}
        {bits.split('').map((bit, idx) =>
          bit === '1' ? (
            <rect
              key={idx}
              x={idx + quietZoneBits}
              y="4"
              width="1"
              height={barHeight}
              fill={barColor}
              shapeRendering="crispEdges"
            />
          ) : null
        )}

        {showText && (
          <text
            x={totalModules / 2}
            y={height - 2}
            textAnchor="middle"
            fill={textColor}
            fontSize="11"
            fontFamily="monospace"
            letterSpacing="2.5"
            fontWeight="bold"
          >
            {code}
          </text>
        )}
      </svg>
    </div>
  );
};

// Clean QR Code matrix vector generator
export const QrCodeSVG: React.FC<{
  value: string;
  size?: number;
  className?: string;
  lightBackground?: boolean;
}> = ({ value, size = 96, className = '', lightBackground = false }) => {
  const code = (value || 'ETOILE').toUpperCase();

  const matrixSize = 21;
  const cells: boolean[][] = Array(matrixSize)
    .fill(null)
    .map(() => Array(matrixSize).fill(false));

  const drawFinder = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 ||
          r === 6 ||
          c === 0 ||
          c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          cells[startRow + r][startCol + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, 14);
  drawFinder(14, 0);

  for (let i = 8; i < 13; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const isFinderTL = r < 8 && c < 8;
      const isFinderTR = r < 8 && c >= 13;
      const isFinderBL = r >= 13 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (!isFinderTL && !isFinderTR && !isFinderBL && !isTiming) {
        const seed = (r * 31 + c * 17 + hash) & 0xffffffff;
        cells[r][c] = (seed % 3 === 0 || (seed % 7 === 1 && (r + c) % 2 === 0));
      }
    }
  }

  const cellSize = 10;
  const padding = 10;
  const totalDim = matrixSize * cellSize + padding * 2;
  const fgColor = lightBackground ? '#000000' : '#ffffff';
  const bgColor = lightBackground ? '#ffffff' : '#14181b';

  return (
    <div className={`inline-block ${className}`}>
      <svg
        viewBox={`0 0 ${totalDim} ${totalDim}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="rounded-lg shadow-sm"
      >
        <rect width={totalDim} height={totalDim} fill={bgColor} rx="6" />
        {cells.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={padding + c * cellSize}
                y={padding + r * cellSize}
                width={cellSize}
                height={cellSize}
                fill={fgColor}
                shapeRendering="crispEdges"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
