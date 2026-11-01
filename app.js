import {
  centerCropLossPercent,
  exportRatios,
  formatBytes,
  maxExportEdge,
  maxInputBytes,
  photoExportPlan,
  sanitizeFilename,
} from './core.mjs';

const copy = {
  zh: {
    eyebrow: '浏览器本地工具',
    title: '检查图片，再导出下一步需要的版本。',
    intro: '读取尺寸、比例和居中裁切风险；把完整照片放入指定画布并添加留白。图片只在当前浏览器处理，不上传、不登录、不调用 AI。',
    choose: '选择图片',
    drop: '拖入 JPEG、PNG 或 WebP，或点击选择',
    limits: '输入上限 10 MiB；支持 JPEG、PNG、WebP。',
    ratio: '目标比例',
    edge: '长边像素',
    padding: '最小留白（每侧）',
    background: '留白颜色',
    format: '导出格式',
    enlarge: '允许放大较小图片',
    enlargeHelp: '放大只会缩放现有像素，不会补回缺失细节。',
    original: '原图',
    result: '导出预览',
    dimensions: '尺寸',
    fileSize: '文件大小',
    aspect: '原图比例',
    cropLoss: '居中裁切将去掉',
    noCrop: '当前比例无需裁切',
    output: '输出尺寸',
    outputScale: '原图缩放',
    noPhoto: '先选择一张图片，工具会在本地读取它。',
    invalidType: '请选择 JPEG、PNG 或 WebP 图片。',
    tooLarge: '图片超过 10 MiB，请先导出较小副本。',
    unreadable: '无法读取图片，请换一个新导出的文件。',
    export: '下载导出图片',
    clear: '清除图片',
    ready: '已读取。检查裁切提示后可以导出。',
    exported: '导出完成。原图没有被修改。',
    warning: '裁切风险只按几何比例估算，不识别标签、主体或平台规则；请人工检查重要细节。',
    invalidSettings: '请检查输出尺寸、留白和比例设置。',
    privacy: '隐私：文件通过浏览器对象 URL 和 Canvas 处理，不发送到服务器。关闭页面后本地选择会清除。',
    language: 'English',
  },
  en: {
    eyebrow: 'BROWSER-LOCAL TOOL',
    title: 'Preflight an image before its next job.',
    intro: 'Inspect dimensions, aspect ratio and center-crop risk. Fit the complete photo into a target canvas with margins. Your image stays in this browser: no upload, sign-in or AI call.',
    choose: 'Choose an image',
    drop: 'Drop a JPEG, PNG or WebP here, or choose a file',
    limits: 'Up to 10 MiB; JPEG, PNG and WebP are supported.',
    ratio: 'Target ratio',
    edge: 'Long edge (px)',
    padding: 'Minimum margin (each side)',
    background: 'Margin color',
    format: 'Export format',
    enlarge: 'Allow enlarging a smaller image',
    enlargeHelp: 'Enlarging scales existing pixels; it cannot restore missing detail.',
    original: 'Original',
    result: 'Export preview',
    dimensions: 'Dimensions',
    fileSize: 'File size',
    aspect: 'Source ratio',
    cropLoss: 'A center crop would remove about',
    noCrop: 'The source already fits this ratio',
    output: 'Output size',
    outputScale: 'Source scale',
    noPhoto: 'Choose an image first. It will be read locally in this browser.',
    invalidType: 'Choose a JPEG, PNG or WebP image.',
    tooLarge: 'This image is larger than 10 MiB. Export a smaller copy first.',
    unreadable: 'The image could not be read. Try a fresh export.',
    export: 'Download export',
    clear: 'Clear image',
    ready: 'Ready. Review the crop note, then export a copy.',
    exported: 'Export complete. The original was not changed.',
    warning: 'Crop risk is geometric only. It does not identify labels, subjects or platform rules; inspect important details yourself.',
    invalidSettings: 'Check the output size, margin and ratio settings.',
    privacy: 'Privacy: the file is processed with an object URL and Canvas in this browser. The selected file is cleared when you leave.',
    language: '中文',
  },
};

const $ = (selector) => document.querySelector(selector);
const els = {
  app: $('#app'),
  file: $('#file-input'),
  drop: $('#drop-zone'),
  language: $('#language-toggle'),
  ratio: $('#ratio'),
  edge: $('#long-edge'),
  padding: $('#padding'),
  paddingValue: $('#padding-value'),
  background: $('#background'),
  format: $('#format'),
  enlarge: $('#enlarge'),
  chooseButton: $('#choose-button'),
  clearButton: $('#clear-button'),
  exportButton: $('#export-button'),
  status: $('#status'),
  originalCanvas: $('#original-canvas'),
  resultCanvas: $('#result-canvas'),
  originalEmpty: $('#original-empty'),
  resultEmpty: $('#result-empty'),
  metrics: $('#metrics'),
  cropNote: $('#crop-note'),
  warning: $('#warning'),
};

let language = localStorage.getItem('local-image-preflight-language') === 'en' ? 'en' : 'zh';
let photo = null;
let objectUrl = '';
let image = null;

function text(key) {
  return copy[language][key];
}

function setText(selector, key) {
  const element = $(selector);
  if (element) element.textContent = text(key);
}

function applyLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = language === 'zh' ? '本地图片预检 · Local Image Preflight' : 'Local Image Preflight';
  document.querySelectorAll('[data-copy]').forEach((element) => {
    const key = element.dataset.copy;
    if (key && text(key)) element.textContent = text(key);
  });
  els.language.textContent = text('language');
  els.paddingValue.textContent = `${els.padding.value}%`;
  updateState();
}

function setStatus(message, kind = '') {
  els.status.textContent = message;
  els.status.dataset.kind = kind;
}

function clearCanvas(canvas) {
  const context = canvas.getContext('2d');
  if (context) context.clearRect(0, 0, canvas.width, canvas.height);
  canvas.hidden = true;
}

function drawContain(canvas, source, maxWidth = 1000, maxHeight = 640) {
  const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  canvas.hidden = false;
}

function renderOutput() {
  if (!photo || !image) {
    clearCanvas(els.resultCanvas);
    els.resultEmpty.hidden = false;
    return null;
  }
  let plan;
  try {
    plan = photoExportPlan(
      photo.width,
      photo.height,
      els.ratio.value,
      Number(els.edge.value),
      Number(els.padding.value),
      els.enlarge.checked,
    );
  } catch {
    clearCanvas(els.resultCanvas);
    els.resultEmpty.hidden = false;
    return null;
  }
  els.resultCanvas.width = plan.width;
  els.resultCanvas.height = plan.height;
  const context = els.resultCanvas.getContext('2d');
  context.fillStyle = els.background.value;
  context.fillRect(0, 0, plan.width, plan.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, plan.x, plan.y, plan.drawWidth, plan.drawHeight);
  els.resultCanvas.hidden = false;
  els.resultEmpty.hidden = true;
  return plan;
}

function updateState() {
  const plan = renderOutput();
  const hasPhoto = Boolean(photo && image);
  els.clearButton.disabled = !hasPhoto;
  els.exportButton.disabled = !hasPhoto || !plan;
  els.warning.hidden = !hasPhoto;
  if (!hasPhoto) {
    els.metrics.hidden = true;
    els.cropNote.hidden = true;
    els.originalEmpty.hidden = false;
    clearCanvas(els.originalCanvas);
    setStatus(text('noPhoto'));
    return;
  }
  if (!plan) {
    els.metrics.hidden = true;
    els.cropNote.hidden = true;
    els.warning.hidden = true;
    setStatus(text('invalidSettings'), 'error');
    return;
  }
  els.metrics.hidden = false;
  els.originalEmpty.hidden = true;
  const loss = centerCropLossPercent(photo.width, photo.height, els.ratio.value);
  $('#metric-dimensions').textContent = `${photo.width} × ${photo.height} px`;
  $('#metric-size').textContent = formatBytes(photo.size);
  $('#metric-aspect').textContent = `${(photo.width / photo.height).toFixed(3)}:1`;
  $('#metric-output').textContent = `${plan.width} × ${plan.height} px`;
  $('#metric-scale').textContent = `${(plan.scale * 100).toFixed(1)}%`;
  els.cropNote.hidden = false;
  els.cropNote.textContent = loss < 0.05
    ? text('noCrop')
    : language === 'zh'
      ? `${text('cropLoss')} ${loss.toFixed(1)}% 的原始画面面积。`
      : `${text('cropLoss')} ${loss.toFixed(1)}% of the original image area.`;
  setStatus(text('ready'));
}

function loadFile(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    setStatus(text('invalidType'), 'error');
    return;
  }
  if (file.size > maxInputBytes) {
    setStatus(text('tooLarge'), 'error');
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  const nextImage = new Image();
  nextImage.onload = () => {
    image = nextImage;
    photo = { name: file.name, size: file.size, width: nextImage.naturalWidth, height: nextImage.naturalHeight };
    drawContain(els.originalCanvas, nextImage);
    updateState();
  };
  nextImage.onerror = () => {
    image = null;
    photo = null;
    updateState();
    setStatus(text('unreadable'), 'error');
  };
  nextImage.src = objectUrl;
}

function clearPhoto() {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = '';
  image = null;
  photo = null;
  els.file.value = '';
  updateState();
}

function download() {
  let plan;
  try { plan = renderOutput(); } catch { plan = null; }
  if (!photo || !image || !plan) return;
  const mime = els.format.value;
  els.resultCanvas.toBlob((blob) => {
    if (!blob) {
      setStatus(text('unreadable'), 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(photo.name)}-${els.ratio.value}.${mime === 'image/png' ? 'png' : 'jpg'}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus(text('exported'), 'success');
  }, mime, mime === 'image/jpeg' ? 0.92 : undefined);
}

els.chooseButton.addEventListener('click', () => els.file.click());
els.file.addEventListener('change', () => loadFile(els.file.files?.[0]));
els.clearButton.addEventListener('click', clearPhoto);
els.exportButton.addEventListener('click', download);
els.language.addEventListener('click', () => {
  language = language === 'zh' ? 'en' : 'zh';
  localStorage.setItem('local-image-preflight-language', language);
  applyLanguage();
});
[els.ratio, els.edge, els.padding, els.background, els.format, els.enlarge].forEach((control) => {
  control.addEventListener('input', () => {
    if (control === els.padding) els.paddingValue.textContent = `${els.padding.value}%`;
    updateState();
  });
});

['dragenter', 'dragover'].forEach((eventName) => els.drop.addEventListener(eventName, (event) => {
  event.preventDefault();
  els.drop.dataset.dragging = 'true';
}));
['dragleave', 'drop'].forEach((eventName) => els.drop.addEventListener(eventName, (event) => {
  event.preventDefault();
  els.drop.dataset.dragging = 'false';
}));
els.drop.addEventListener('drop', (event) => loadFile(event.dataTransfer?.files?.[0]));

applyLanguage();
