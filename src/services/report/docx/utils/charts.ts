import { Paragraph, ImageRun, AlignmentType } from 'docx';

// IBM Design Language colour palette for chart slices
const CHART_COLORS = [
  '#0F62FE', '#8A3FFC', '#24A148', '#FF832B',
  '#1192E8', '#DA1E28', '#009D9A', '#EE538B',
];

interface PieSlice {
  label: string;
  value: number;
}

/**
 * Render a pie chart to a PNG Uint8Array using an OffscreenCanvas (or regular
 * canvas when OffscreenCanvas is unavailable).  The chart is drawn at 3×
 * resolution for retina-quality output.
 *
 * Base dimensions: 480 × 280  →  Canvas: 1440 × 840
 */
export async function renderPieChart(
  title: string,
  slices: PieSlice[],
): Promise<Uint8Array> {
  const BASE_W = 480;
  const BASE_H = 280;
  const SCALE = 3;
  const W = BASE_W * SCALE;
  const H = BASE_H * SCALE;

  // Create canvas
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(W, H);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
  }

  const ctx = canvas.getContext('2d') as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#161616';
  ctx.font = `bold ${16 * SCALE}px "IBM Plex Sans", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 28 * SCALE);

  // Pie geometry
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    ctx.fillStyle = '#525252';
    ctx.font = `${12 * SCALE}px "IBM Plex Sans", Arial, sans-serif`;
    ctx.fillText('No data', W / 2, H / 2);
    return canvasToUint8Array(canvas);
  }

  const cx = 160 * SCALE;
  const cy = 165 * SCALE;
  const radius = 100 * SCALE;

  let startAngle = -Math.PI / 2;
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const sliceAngle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();

    // Percentage label on slice (only if >= 5%)
    const pct = (slice.value / total) * 100;
    if (pct >= 5) {
      const midAngle = startAngle + sliceAngle / 2;
      const labelR = radius * 0.65;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${10 * SCALE}px "IBM Plex Sans", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(pct)}%`, lx, ly);
    }

    startAngle = endAngle;
  }

  // Legend (right side)
  const legendX = 290 * SCALE;
  let legendY = 50 * SCALE;
  const lineHeight = 20 * SCALE;

  for (let i = 0; i < slices.length && i < 10; i++) {
    const slice = slices[i];
    const color = CHART_COLORS[i % CHART_COLORS.length];

    // Color swatch
    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY - 8 * SCALE, 10 * SCALE, 10 * SCALE);

    // Label
    ctx.fillStyle = '#161616';
    ctx.font = `${9 * SCALE}px "IBM Plex Sans", Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const pct = ((slice.value / total) * 100).toFixed(1);
    const label = truncateLabel(slice.label, 18);
    ctx.fillText(`${label} (${pct}%)`, legendX + 14 * SCALE, legendY);

    legendY += lineHeight;
  }

  if (slices.length > 10) {
    ctx.fillStyle = '#525252';
    ctx.font = `italic ${9 * SCALE}px "IBM Plex Sans", Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`+${slices.length - 10} more`, legendX + 14 * SCALE, legendY);
  }

  return canvasToUint8Array(canvas);
}

function truncateLabel(label: string, max: number): string {
  return label.length > max ? label.slice(0, max - 1) + '…' : label;
}

async function canvasToUint8Array(
  canvas: HTMLCanvasElement | OffscreenCanvas,
): Promise<Uint8Array> {
  let blob: Blob;
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: 'image/png' });
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
  }
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Build a DOCX ImageRun paragraph from pie-chart data.
 * Returns an array containing the image paragraph (to be spread into the
 * document children).
 */
export async function buildPieChartImage(
  title: string,
  slices: PieSlice[],
): Promise<Paragraph> {
  const pngData = await renderPieChart(title, slices);

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        data: pngData,
        transformation: { width: 480, height: 280 },
        type: 'png',
      }),
    ],
  });
}
