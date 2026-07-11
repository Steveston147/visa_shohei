import type { GuaranteeLetterData } from '../domain/guaranteeLetterData';
import { CANVAS_FONT_FAMILY, FONT_PATH } from './constants';
import { InvitationRenderError } from './canvasText';
import { drawDocumentNumber } from './drawDocumentNumber';

export const GUARANTEE_CANVAS_WIDTH = 993;
export const GUARANTEE_CANVAS_HEIGHT = 1404;

const FORM_LEFT = 84;
const FORM_RIGHT = 934;
const VALUE_LEFT = 294;
const VALUE_RIGHT = 812;
const DATE_RIGHT = 892;

let fontPromise: Promise<void> | null = null;

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

function parts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) }
    : { year: '', month: '', day: '' };
}

function reiwaYear(year: string) {
  const numeric = Number(year);
  return numeric >= 2019 ? String(numeric - 2018) : '';
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number) {
  ctx.font = `${weight} ${size}px "${CANVAS_FONT_FAMILY}", sans-serif`;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 15,
  weight = 400,
  align: CanvasTextAlign = 'left',
) {
  ctx.save();
  setFont(ctx, size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#111';
  ctx.fillText(text || '', x, y);
  ctx.restore();
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size = 15,
  minSize = 11,
  weight = 400,
  align: CanvasTextAlign = 'left',
) {
  let current = size;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#111';
  while (current > minSize) {
    setFont(ctx, current, weight);
    if (ctx.measureText(text || '').width <= maxWidth) break;
    current -= 0.5;
  }
  setFont(ctx, current, weight);
  ctx.fillText(text || '', x, y, maxWidth);
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width = 1) {
  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = '#222';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, width = 1) {
  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = '#222';
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function check(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 7);
  ctx.lineTo(x + 5, y + 11);
  ctx.lineTo(x + 14, y + 1);
  ctx.stroke();
  ctx.restore();
}

function labelLine(ctx: CanvasRenderingContext2D, label: string, y: number, x1 = VALUE_LEFT, x2 = VALUE_RIGHT) {
  drawText(ctx, label, 135, y, 15, 500);
  line(ctx, x1, y + 5, x2, y + 5);
}

function drawDateRow(
  ctx: CanvasRenderingContext2D,
  date: { year: string; month: string; day: string },
  y: number,
  includeEra: boolean,
) {
  const year = includeEra ? reiwaYear(date.year) : date.year;
  if (includeEra) drawText(ctx, '令和', DATE_RIGHT - 194, y, 15, 400);
  else drawText(ctx, '西暦', DATE_RIGHT - 194, y, 15, 400);
  drawText(ctx, year, DATE_RIGHT - 119, y, 15, 400, 'center');
  drawText(ctx, '年', DATE_RIGHT - 82, y, 15, 400);
  drawText(ctx, date.month, DATE_RIGHT - 43, y, 15, 400, 'center');
  drawText(ctx, '月', DATE_RIGHT - 20, y, 15, 400);
  drawText(ctx, date.day, DATE_RIGHT + 19, y, 15, 400, 'center');
  drawText(ctx, '日', DATE_RIGHT + 40, y, 15, 400);
}

function drawBirthRow(
  ctx: CanvasRenderingContext2D,
  label: string,
  date: { year: string; month: string; day: string },
  age: number | null,
  y: number,
) {
  drawText(ctx, label, 135, y, 15, 500);
  drawText(ctx, '西暦', 303, y, 14, 400);
  drawText(ctx, date.year, 404, y, 14, 400, 'center');
  drawText(ctx, '年', 451, y, 14, 400);
  drawText(ctx, date.month, 518, y, 14, 400, 'center');
  drawText(ctx, '月', 545, y, 14, 400);
  drawText(ctx, date.day, 610, y, 14, 400, 'center');
  drawText(ctx, '日生', 638, y, 14, 400);
  drawText(ctx, age === null ? '' : String(age), 724, y, 14, 400, 'center');
  drawText(ctx, '歳', 751, y, 14, 400);
}

export async function renderGuaranteeCanvas(data: GuaranteeLetterData, canvas?: HTMLCanvasElement) {
  await loadFont();
  const target = canvas ?? document.createElement('canvas');
  target.width = GUARANTEE_CANVAS_WIDTH;
  target.height = GUARANTEE_CANVAS_HEIGHT;
  const ctx = target.getContext('2d');
  if (!ctx) throw new InvitationRenderError('CANVAS_CONTEXT', '身元保証書Canvasを作成できませんでした。');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, target.width, target.height);
  box(ctx, FORM_LEFT, 74, FORM_RIGHT - FORM_LEFT, 1089, 1.15);

  drawText(ctx, '身元保証書', 496, 114, 28, 700, 'center');

  const documentDate = parts(data.documentDate);
  drawDateRow(ctx, documentDate, 151, true);

  drawText(ctx, '在', 114, 205, 16, 400);
  line(ctx, 138, 213, 280, 213);
  drawFittedText(ctx, data.diplomaticMission, 209, 207, 132, 15, 11, 400, 'center');
  drawText(ctx, '日本国', 296, 205, 16, 400);
  drawText(ctx, '大使', 366, 178, 16, 400);
  box(ctx, 425, 164, 14, 14);
  drawText(ctx, '総領事', 365, 231, 16, 400);
  box(ctx, 425, 217, 14, 14);
  drawText(ctx, '殿', 469, 205, 16, 400);
  if (data.missionType === 'embassy') check(ctx, 425, 164);
  if (data.missionType === 'consulate') check(ctx, 425, 217);

  box(ctx, 114, 279, 141, 29, 1.1);
  drawText(ctx, 'ビ ザ 申 請 人', 184, 301, 18, 700, 'center');
  drawText(ctx, '※氏名は必ず旅券上のアルファベット表記で記載してください。', 114, 325, 12, 400);
  drawText(ctx, '申請人が2名以上の場合は、代表者の氏名を記入し、申請人名簿を添付してください。', 114, 344, 11, 400);

  labelLine(ctx, '国　　　籍', 376);
  labelLine(ctx, '職　　　業', 406);
  labelLine(ctx, '氏　　　名', 436);
  drawFittedText(ctx, data.applicantNationality, 304, 372, 500, 15, 11);
  drawFittedText(ctx, data.applicantOccupation, 304, 402, 500, 15, 11);
  drawFittedText(ctx, data.applicantPassportName, 304, 432, 315, 15, 11);

  drawText(ctx, '性別', 631, 436, 14, 400);
  drawText(ctx, '男', 682, 436, 14, 400);
  box(ctx, 706, 423, 13, 13);
  drawText(ctx, '・', 727, 436, 14, 400);
  drawText(ctx, '女', 744, 436, 14, 400);
  box(ctx, 768, 423, 13, 13);
  if (data.applicantGender === 'male') check(ctx, 706, 423);
  if (data.applicantGender === 'female') check(ctx, 768, 423);

  drawBirthRow(ctx, '生 年 月 日', parts(data.applicantDateOfBirth), data.applicantAge, 466);

  drawText(ctx, '上記の者の本邦入国に関し、以下の事項について保証します。', 131, 514, 16, 600);
  drawText(ctx, '1　滞在費', 151, 556, 16, 600);
  drawText(ctx, '2　帰国旅費', 151, 581, 16, 600);
  drawText(ctx, '3　法令の遵守', 151, 606, 16, 600);
  drawText(ctx, '上記のとおり相違ありません。', 131, 650, 16, 600);

  box(ctx, 114, 687, 151, 29, 1.1);
  drawText(ctx, '身 元 保 証 人', 189, 709, 18, 700, 'center');
  drawText(ctx, '（注）', 276, 709, 12, 400);

  drawText(ctx, '住　　　所', 135, 752, 15, 500);
  drawText(ctx, '〒', 293, 752, 14, 400);
  drawFittedText(ctx, data.guarantorPostalCode, 325, 752, 165, 14, 11);
  line(ctx, 294, 760, 490, 760);
  line(ctx, 294, 790, 861, 790);
  drawFittedText(ctx, data.guarantorAddress, 304, 786, 548, 14, 10.5);

  labelLine(ctx, '職　　　業', 820, 294, 812);
  labelLine(ctx, '氏　　　名', 850, 294, 812);
  drawFittedText(ctx, data.guarantorOccupation, 304, 816, 500, 14, 10.5);
  drawFittedText(ctx, data.guarantorName, 304, 846, 500, 14, 10.5);

  drawBirthRow(ctx, '生 年 月 日', parts(data.guarantorDateOfBirth), data.guarantorAge, 880);

  labelLine(ctx, '電 話 番 号', 910, 294, 812);
  drawFittedText(ctx, data.guarantorPhone, 304, 906, 285, 14, 11);
  drawFittedText(ctx, data.guarantorExtension ? `（内線 ${data.guarantorExtension}）` : '', 640, 906, 170, 13, 10);
  labelLine(ctx, 'ＦＡＸ番号', 940, 294, 812);
  drawFittedText(ctx, data.guarantorFax, 304, 936, 500, 14, 11);
  labelLine(ctx, '申請人との関係', 970, 294, 812);
  drawFittedText(ctx, data.relationshipToApplicant, 304, 966, 500, 14, 10.5);

  drawText(ctx, '【以下は、会社・団体が招へいする場合に記入してください】', 122, 1012, 15, 600);
  labelLine(ctx, '担当者所属先名', 1044, 294, 812);
  drawFittedText(ctx, data.organisationName, 304, 1040, 500, 14, 10.5);
  labelLine(ctx, '担 当 者 氏 名', 1074, 294, 812);
  drawFittedText(ctx, data.contactPersonName, 304, 1070, 500, 14, 10.5);
  labelLine(ctx, '担当者電話番号', 1104, 294, 812);
  drawFittedText(ctx, data.contactPhone, 304, 1100, 285, 14, 11);
  drawFittedText(ctx, data.contactExtension ? `（内線 ${data.contactExtension}）` : '', 640, 1100, 170, 13, 10);
  labelLine(ctx, 'ＦＡＸ番号', 1134, 294, 812);
  drawFittedText(ctx, data.contactFax, 304, 1130, 500, 14, 11);

  drawText(ctx, '（注）会社・団体等が招へいする場合には会社・団体名及び役職名を記入してください。', 105, 1190, 13, 400);

  drawDocumentNumber(target, data.documentNumber);
  return target;
}
