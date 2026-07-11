import type { GuaranteeLetterData } from '../domain/guaranteeLetterData';
import { CANVAS_FONT_FAMILY, FONT_PATH } from './constants';
import { InvitationRenderError } from './canvasText';
import { GUARANTEE_TEMPLATE_DATA_URL } from './guaranteeTemplateData';

export const GUARANTEE_CANVAS_WIDTH = 1241;
export const GUARANTEE_CANVAS_HEIGHT = 1754;

const DATE_RIGHT = 1182;

let fontPromise: Promise<void> | null = null;
let templatePromise: Promise<HTMLImageElement> | null = null;

function loadFont() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    const face = new FontFace(CANVAS_FONT_FAMILY, `url(${FONT_PATH})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    await document.fonts.ready;
  })().catch((error) => {
    fontPromise = null;
    throw new InvitationRenderError('FONT_LOAD', '日本語フォントを読み込めませんでした。', error);
  });
  return fontPromise;
}

function loadTemplate() {
  if (templatePromise) return templatePromise;
  templatePromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (error) => {
      templatePromise = null;
      reject(new InvitationRenderError('BACKGROUND_LOAD', '身元保証書の正式テンプレートを読み込めませんでした。', error));
    };
    image.src = GUARANTEE_TEMPLATE_DATA_URL;
  });
  return templatePromise;
}

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
    : { year: 0, month: 0, day: 0 };
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px "${CANVAS_FONT_FAMILY}", sans-serif`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  options: { size?: number; weight?: number; align?: CanvasTextAlign; maxWidth?: number; minSize?: number } = {},
) {
  const text = value.trim();
  if (!text) return;
  const { size = 18, weight = 400, align = 'left', maxWidth, minSize = 11 } = options;
  let actualSize = size;

  ctx.save();
  ctx.fillStyle = '#111';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  setFont(ctx, actualSize, weight);

  if (maxWidth) {
    while (actualSize > minSize && ctx.measureText(text).width > maxWidth) {
      actualSize -= 0.5;
      setFont(ctx, actualSize, weight);
    }
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 7 * scale);
  ctx.lineTo(x + 6 * scale, y + 13 * scale);
  ctx.lineTo(x + 18 * scale, y - 2 * scale);
  ctx.stroke();
  ctx.restore();
}

function drawDocumentNumber(ctx: CanvasRenderingContext2D, value: string) {
  drawText(ctx, value, DATE_RIGHT, 128, {
    size: 16,
    minSize: 11,
    align: 'right',
    maxWidth: 250,
  });
}

function drawDocumentDate(ctx: CanvasRenderingContext2D, value: string) {
  const date = dateParts(value);
  if (!date.year) return;
  drawText(ctx, String(date.year - 2018), 998, 184, { size: 18, align: 'center' });
  drawText(ctx, String(date.month), 1090, 184, { size: 18, align: 'center' });
  drawText(ctx, String(date.day), 1174, 184, { size: 18, align: 'center' });
}

function drawBirthDate(
  ctx: CanvasRenderingContext2D,
  value: string,
  age: number | null,
  positions: { year: number; month: number; day: number; age: number; y: number },
) {
  const date = dateParts(value);
  if (date.year) {
    drawText(ctx, String(date.year), positions.year, positions.y, { size: 17, align: 'center' });
    drawText(ctx, String(date.month), positions.month, positions.y, { size: 17, align: 'center' });
    drawText(ctx, String(date.day), positions.day, positions.y, { size: 17, align: 'center' });
  }
  if (age !== null) drawText(ctx, String(age), positions.age, positions.y, { size: 17, align: 'center' });
}

export async function renderGuaranteeCanvas(data: GuaranteeLetterData, canvas?: HTMLCanvasElement) {
  await Promise.all([loadFont(), loadTemplate()]);
  const template = await loadTemplate();
  const target = canvas ?? document.createElement('canvas');
  target.width = GUARANTEE_CANVAS_WIDTH;
  target.height = GUARANTEE_CANVAS_HEIGHT;
  const ctx = target.getContext('2d');
  if (!ctx) throw new InvitationRenderError('CANVAS_CONTEXT', '身元保証書Canvasを作成できませんでした。');

  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(template, 0, 0, target.width, target.height);

  drawDocumentNumber(ctx, data.documentNumber);
  drawDocumentDate(ctx, data.documentDate);

  drawText(ctx, data.diplomaticMission, 264, 253, { size: 18, align: 'center', maxWidth: 180, minSize: 12 });
  if (data.missionType === 'embassy') drawCheck(ctx, 554, 210, 0.9);
  if (data.missionType === 'consulate') drawCheck(ctx, 554, 281, 0.9);

  drawText(ctx, data.applicantNationality, 390, 470, { size: 18, maxWidth: 500 });
  drawText(ctx, data.applicantOccupation, 390, 507, { size: 18, maxWidth: 500 });
  drawText(ctx, data.applicantPassportName, 390, 545, { size: 18, maxWidth: 425, minSize: 12 });
  if (data.applicantGender === 'male') drawCheck(ctx, 914, 531, 0.9);
  if (data.applicantGender === 'female') drawCheck(ctx, 992, 531, 0.9);
  drawBirthDate(ctx, data.applicantDateOfBirth, data.applicantAge, {
    year: 510,
    month: 645,
    day: 748,
    age: 920,
    y: 584,
  });

  drawText(ctx, data.guarantorPostalCode, 430, 959, { size: 17, maxWidth: 170 });
  drawText(ctx, data.guarantorAddress, 390, 1002, { size: 17, maxWidth: 705, minSize: 11 });
  drawText(ctx, data.guarantorOccupation, 390, 1041, { size: 17, maxWidth: 660, minSize: 11 });
  drawText(ctx, data.guarantorName, 390, 1080, { size: 17, maxWidth: 660, minSize: 11 });
  drawBirthDate(ctx, data.guarantorDateOfBirth, data.guarantorAge, {
    year: 604,
    month: 714,
    day: 817,
    age: 959,
    y: 1120,
  });
  drawText(ctx, data.guarantorPhone, 390, 1160, { size: 17, maxWidth: 400 });
  drawText(ctx, data.guarantorExtension, 886, 1160, { size: 16, align: 'center', maxWidth: 170 });
  drawText(ctx, data.guarantorFax, 390, 1200, { size: 17, maxWidth: 650 });
  drawText(ctx, data.relationshipToApplicant, 390, 1240, { size: 17, maxWidth: 650 });

  drawText(ctx, data.organisationName, 390, 1320, { size: 17, maxWidth: 650, minSize: 11 });
  drawText(ctx, data.contactPersonName, 390, 1358, { size: 17, maxWidth: 650, minSize: 11 });
  drawText(ctx, data.contactPhone, 390, 1397, { size: 17, maxWidth: 400 });
  drawText(ctx, data.contactExtension, 886, 1397, { size: 16, align: 'center', maxWidth: 170 });
  drawText(ctx, data.contactFax, 390, 1436, { size: 17, maxWidth: 650 });

  return target;
}
