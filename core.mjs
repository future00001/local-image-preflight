export const exportRatios = [
  { id: 'square', label: '1:1', width: 1, height: 1 },
  { id: 'four-five', label: '4:5', width: 4, height: 5 },
  { id: 'three-four', label: '3:4', width: 3, height: 4 },
  { id: 'two-three', label: '2:3', width: 2, height: 3 },
  { id: 'four-three', label: '4:3', width: 4, height: 3 },
  { id: 'three-two', label: '3:2', width: 3, height: 2 },
  { id: 'wide', label: '16:9', width: 16, height: 9 },
];

export const maxInputBytes = 10 * 1024 * 1024;
export const maxExportEdge = 3000;
export const maxSourcePixels = 32_000_000;

export function getRatio(id) {
  return exportRatios.find((item) => item.id === id) || null;
}

export function photoExportPlan(sourceWidth, sourceHeight, ratioId, longEdge, padding, enlarge = false) {
  const ratio = getRatio(ratioId);
  if (!ratio || ![sourceWidth, sourceHeight, longEdge, padding].every(Number.isFinite)
    || ![sourceWidth, sourceHeight, longEdge].every(Number.isInteger)
    || sourceWidth < 1 || sourceHeight < 1 || sourceWidth * sourceHeight > maxSourcePixels
    || longEdge < 64 || longEdge > maxExportEdge || padding < 0 || padding > 20) {
    throw new Error('Invalid export dimensions');
  }
  const width = ratio.width >= ratio.height ? longEdge : Math.round(longEdge * ratio.width / ratio.height);
  const height = ratio.height >= ratio.width ? longEdge : Math.round(longEdge * ratio.height / ratio.width);
  const available = 1 - 2 * padding / 100;
  const fit = Math.min(width * available / sourceWidth, height * available / sourceHeight);
  const scale = enlarge ? fit : Math.min(1, fit);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  return {
    width,
    height,
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
    scale,
  };
}

export function centerCropLossPercent(sourceWidth, sourceHeight, ratioId) {
  const ratio = getRatio(ratioId);
  if (!ratio || !Number.isInteger(sourceWidth) || !Number.isInteger(sourceHeight) || sourceWidth < 1 || sourceHeight < 1) {
    throw new Error('Invalid crop dimensions');
  }
  const target = ratio.width / ratio.height;
  const source = sourceWidth / sourceHeight;
  const cropWidth = source > target ? sourceHeight * target : sourceWidth;
  const cropHeight = source > target ? sourceHeight : sourceWidth / target;
  return Math.max(0, (1 - cropWidth * cropHeight / (sourceWidth * sourceHeight)) * 100);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

export function sanitizeFilename(name) {
  return String(name || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .slice(0, 90) || 'image';
}
