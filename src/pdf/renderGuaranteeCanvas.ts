import type { GuaranteeLetterData } from '../domain/guaranteeLetterData';
import { CANVAS_FONT_FAMILY, FONT_PATH } from './constants';
import { InvitationRenderError } from './canvasText';

export const GUARANTEE_CANVAS_WIDTH = 993;
export const GUARANTEE_CANVAS_HEIGHT = 1404;

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
  return match ? { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) } : { year: '', month: '', day: '' };
}

function reiwaYear(year: string) {
  const numeric = Number(year);
  return numeric >= 2019 ? String(numeric - 2018) : '';
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number = 15,
  weight: number = 400,
  align: CanvasTextAlign = 'left',
) {
  ctx.save();
  ctx.font = `${weight} ${size}px "${CANVAS_FONT_FAMILY}", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#111';
  ctx.fillText(text || '', x, y);
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
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x + 5, y + 11);
  ctx.lineTo(x + 15, y - 2);
  ctx.stroke();
  ctx.restore();
}

function labelLine(ctx: CanvasRenderingContext2D, label: string, y: number, x1 = 294, x2 = 810) {
  drawText(ctx, label, 135, y, 16, 500);
  line(ctx, x1, y + 4, x2, y + 4);
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
  box(ctx, 84, 74, 850, 1089, 1.2);

  drawText(ctx, '身元保証書', 496, 114, 29, 700, 'center');

  const documentDate = parts(data.documentDate);
  drawText(ctx, '令和', 678, 151, 16, 500);
  drawText(ctx, reiwaYear(documentDate.year), 773, 151, 16, 500, 'center');
  drawText(ctx, '年', 800, 151, 16, 500);
  drawText(ctx, documentDate.month, 852, 151, 16, 500, 'center');
  drawText(ctx, '月', 879, 151, 16, 500);
  drawText(ctx, documentDate.day, 927, 151, 16, 500, 'center');
  drawText(ctx, '日', 951, 151, 16, 500);

  drawText(ctx, '在', 114, 205, 17, 500);
  line(ctx, 138, 213, 280, 213);
  drawText(ctx, data.diplomaticMission, 209, 207, 15, 400, 'center');
  drawText(ctx, '日本国', 296, 205, 17, 500);
  drawText(ctx, '大 使', 366, 177, 17, 500);
  box(ctx, 427, 164, 13, 13);
  drawText(ctx, '総領事', 365, 231, 17, 500);
  box(ctx, 427, 218, 13, 13);
  drawText(ctx, '殿', 469, 205, 17, 500);
  if (data.missionType === 'embassy') check(ctx, 427, 164);
  if (data.missionType === 'consulate') check(ctx, 427, 218);

  box(ctx, 114, 279, 141, 29, 1.2);
  drawText(ctx, 'ビ ザ 申 請 人', 184, 301, 19, 700, 'center');
  drawText(ctx, '※氏名は必ず旅券上のアルファベット表記で記載してください。', 114, 325, 13, 400);
  drawText(ctx, '申請人は1名につき1通作成します。', 114, 345, 13, 400);

  labelLine(ctx, '国　　　籍', 376);
  labelLine(ctx, '職　　　業', 406);
  labelLine(ctx, '氏　　　名', 436);
  drawText(ctx, data.applicantNationality, 304, 372, 15);
  drawText(ctx, data.applicantOccupation, 304, 402, 15);
  drawText(ctx, data.applicantPassportName, 304, 432, 15);
  drawText(ctx, '性別', 631, 436, 15, 500);
  drawText(ctx, '男□・女□', 685, 436, 15, 500);
  if (data.applicantGender === 'male') check(ctx, 712, 423);
  if (data.applicantGender === 'female') check(ctx, 767, 423);

  const applicantBirth = parts(data.applicantDateOfBirth);
  drawText(ctx, '生 年 月 日', 135, 466, 16, 500);
  drawText(ctx, '西暦', 302, 466, 15, 500);
  drawText(ctx, applicantBirth.year, 384, 466, 15, 400, 'center');
  drawText(ctx, '年', 450, 466, 15, 500);
  drawText(ctx, applicantBirth.month, 515, 466, 15, 400, 'center');
  drawText(ctx, '月', 544, 466, 15, 500);
  drawText(ctx, applicantBirth.day, 608, 466, 15, 400, 'center');
  drawText(ctx, '日生', 640, 466, 15, 500);
  drawText(ctx, String(data.applicantAge), 721, 466, 15, 400, 'center');
  drawText(ctx, '歳', 750, 466, 15, 500);

  drawText(ctx, '上記の者の本邦入国に関し、以下の事項について保証します。', 131, 514, 17, 700);
  drawText(ctx, '1　滞在費', 151, 556, 17, 700);
  drawText(ctx, '2　帰国旅費', 151, 581, 17, 700);
  drawText(ctx, '3　法令の遵守', 151, 606, 17, 700);
  drawText(ctx, '上記のとおり相違ありません。', 131, 650, 17, 700);

  box(ctx, 114, 687, 151, 29, 1.2);
  drawText(ctx, '身 元 保 証 人', 189, 709, 19, 700, 'center');
  drawText(ctx, '（注）', 276, 709, 13, 400);

  drawText(ctx, '住　　　所', 135, 752, 16, 500);
  drawText(ctx, '〒', 293, 752, 15, 500);
  drawText(ctx, data.guarantorPostalCode, 325, 752, 15);
  line(ctx, 294, 760, 490, 760);
  line(ctx, 294, 790, 861, 790);
  drawText(ctx, data.guarantorAddress, 304, 786, 15);

  labelLine(ctx, '職　　　業', 820, 294, 812);
  labelLine(ctx, '氏　　　名', 850, 294, 812);
  drawText(ctx, data.guarantorOccupation, 304, 816, 15);
  drawText(ctx, data.guarantorName, 304, 846, 15);

  const guarantorBirth = parts(data.guarantorDateOfBirth);
  drawText(ctx, '生 年 月 日', 135, 880, 16, 500);
  drawText(ctx, '西暦', 303, 880, 15, 500);
  drawText(ctx, guarantorBirth.year, 406, 880, 15, 400, 'center');
  drawText(ctx, '年', 454, 880, 15, 500);
  drawText(ctx, guarantorBirth.month, 535, 880, 15, 400, 'center');
  drawText(ctx, '月', 563, 880, 15, 500);
  drawText(ctx, guarantorBirth.day, 635, 880, 15, 400, 'center');
  drawText(ctx, '日生', 662, 880, 15, 500);
  drawText(ctx, data.guarantorAge === null ? '' : String(data.guarantorAge), 735, 880, 15, 400, 'center');
  drawText(ctx, '歳', 760, 880, 15, 500);

  labelLine(ctx, '電 話 番 号', 910, 294, 812);
  drawText(ctx, data.guarantorPhone, 304, 906, 15);
  drawText(ctx, data.guarantorExtension ? `（内線 ${data.guarantorExtension}）` : '', 640, 906, 14);
  labelLine(ctx, 'Ｆ Ａ Ｘ 番 号', 940, 294, 812);
  drawText(ctx, data.guarantorFax, 304, 936, 15);
  labelLine(ctx, '申請人との関係', 970, 294, 812);
  drawText(ctx, data.relationshipToApplicant, 304, 966, 15);

  drawText(ctx, '【以下は、会社・団体が招へいする場合に記入してください】', 122, 1012, 16, 700);
  labelLine(ctx, '担当者所属先名', 1044, 294, 812);
  drawText(ctx, data.organisationName, 304, 1040, 15);
  labelLine(ctx, '担 当 者 氏 名', 1074, 294, 812);
  drawText(ctx, data.contactPersonName, 304, 1070, 15);
  labelLine(ctx, '担当者電話番号', 1104, 294, 812);
  drawText(ctx, data.contactPhone, 304, 1100, 15);
  drawText(ctx, data.contactExtension ? `（内線 ${data.contactExtension}）` : '', 640, 1100, 14);
  labelLine(ctx, 'Ｆ Ａ Ｘ 番 号', 1134, 294, 812);
  drawText(ctx, data.contactFax, 304, 1130, 15);

  drawText(ctx, '（注）会社・団体等が招へいする場合には会社・団体名及び役職名を記入してください。', 105, 1190, 14, 500);
  return target;
}
