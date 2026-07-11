import type { GuaranteeLetterData } from '../domain/guaranteeLetterData';
import { CANVAS_FONT_FAMILY, FONT_PATH } from './constants';
import {
  assertCurrentA4PointConversion,
  drawCheckbox,
  drawDebug,
  drawSingleLine,
  InvitationRenderError,
} from './canvasText';
import {
  guaranteeCheckboxPlacements,
  guaranteeTextPlacements,
  type GuaranteeTextPlacementKey,
} from './guaranteePlacements';
import {
  GUARANTEE_TEMPLATE_DATA_URL,
  GUARANTEE_TEMPLATE_HEIGHT,
  GUARANTEE_TEMPLATE_WIDTH,
} from './guaranteeTemplateData';

export const GUARANTEE_CANVAS_WIDTH = GUARANTEE_TEMPLATE_WIDTH;
export const GUARANTEE_CANVAS_HEIGHT = GUARANTEE_TEMPLATE_HEIGHT;

export type RenderGuaranteeCanvasOptions = {
  canvas?: HTMLCanvasElement;
  debug?: boolean;
};

let backgroundLoadPromise: Promise<HTMLImageElement> | null = null;
let fontLoadPromise: Promise<void> | null = null;

function loadBackgroundImage() {
  if (backgroundLoadPromise) return backgroundLoadPromise;

  backgroundLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      try {
        await image.decode?.();
        resolve(image);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('The official guarantee-letter background could not be decoded.'));
    image.src = GUARANTEE_TEMPLATE_DATA_URL;
  }).catch((error) => {
    backgroundLoadPromise = null;
    throw new InvitationRenderError(
      'IMAGE_LOAD',
      '身元保証書の正式様式を読み込めませんでした。白紙では出力しません。',
      error,
    );
  });

  return backgroundLoadPromise;
}

function loadCanvasFont() {
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = (async () => {
    const face = new FontFace(CANVAS_FONT_FAMILY, `url(${FONT_PATH})`);
    const loadedFace = await face.load();
    document.fonts.add(loadedFace);
    await document.fonts.ready;

    if (!document.fonts.check(`16px "${CANVAS_FONT_FAMILY}"`)) {
      throw new Error('document.fonts.check failed');
    }
  })().catch((error) => {
    fontLoadPromise = null;
    throw new InvitationRenderError('FONT_LOAD', '日本語フォントを読み込めませんでした。', error);
  });

  return fontLoadPromise;
}

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
    : { year: 0, month: 0, day: 0 };
}

function reiwaYear(year: number) {
  return year >= 2019 ? String(year - 2018) : '';
}

export async function renderGuaranteeCanvas(
  data: GuaranteeLetterData,
  options: RenderGuaranteeCanvasOptions = {},
) {
  let image: HTMLImageElement;
  try {
    image = await loadBackgroundImage();
  } catch (error) {
    if (error instanceof InvitationRenderError) throw error;
    throw new InvitationRenderError(
      'IMAGE_LOAD',
      '身元保証書の正式様式を読み込めませんでした。白紙では出力しません。',
      error,
    );
  }

  if (
    image.naturalWidth !== GUARANTEE_TEMPLATE_WIDTH
    || image.naturalHeight !== GUARANTEE_TEMPLATE_HEIGHT
  ) {
    throw new InvitationRenderError(
      'IMAGE_DIMENSION',
      `身元保証書の背景画像サイズが不正です（${image.naturalWidth} x ${image.naturalHeight}）。`,
    );
  }

  await loadCanvasFont();

  const target = options.canvas ?? document.createElement('canvas');
  target.width = image.naturalWidth;
  target.height = image.naturalHeight;
  assertCurrentA4PointConversion(target);

  const ctx = target.getContext('2d');
  if (!ctx) {
    throw new InvitationRenderError('CANVAS_CONTEXT', '身元保証書Canvasを作成できませんでした。');
  }

  ctx.clearRect(0, 0, target.width, target.height);
  // Draw the exact 2481 x 3508 official page without scaling. Fixed labels,
  // borders and rules are already in the background and are never redrawn.
  ctx.drawImage(image, 0, 0);

  const documentDate = dateParts(data.documentDate);
  const applicantBirthDate = dateParts(data.applicantDateOfBirth);
  const guarantorBirthDate = dateParts(data.guarantorDateOfBirth);
  const [guarantorPostalCodeFirst3 = '', guarantorPostalCodeLast4 = ''] = data.guarantorPostalCode.split('-');

  const values: Record<GuaranteeTextPlacementKey, string> = {
    documentNumber: data.documentNumber,
    documentDateYear: reiwaYear(documentDate.year),
    documentDateMonth: documentDate.month ? String(documentDate.month) : '',
    documentDateDay: documentDate.day ? String(documentDate.day) : '',
    diplomaticMission: data.diplomaticMission,
    applicantNationality: data.applicantNationality,
    applicantOccupation: data.applicantOccupation,
    applicantPassportName: data.applicantPassportName,
    applicantBirthYear: applicantBirthDate.year ? String(applicantBirthDate.year) : '',
    applicantBirthMonth: applicantBirthDate.month ? String(applicantBirthDate.month) : '',
    applicantBirthDay: applicantBirthDate.day ? String(applicantBirthDate.day) : '',
    applicantAge: String(data.applicantAge),
    guarantorPostalCodeFirst3,
    guarantorPostalCodeLast4,
    guarantorAddress: data.guarantorAddress,
    guarantorOccupation: data.guarantorOccupation,
    guarantorName: data.guarantorName,
    guarantorBirthYear: guarantorBirthDate.year ? String(guarantorBirthDate.year) : '',
    guarantorBirthMonth: guarantorBirthDate.month ? String(guarantorBirthDate.month) : '',
    guarantorBirthDay: guarantorBirthDate.day ? String(guarantorBirthDate.day) : '',
    guarantorAge: data.guarantorAge === null ? '' : String(data.guarantorAge),
    guarantorPhone: data.guarantorPhone,
    guarantorExtension: data.guarantorExtension,
    guarantorFax: data.guarantorFax,
    relationshipToApplicant: data.relationshipToApplicant,
    organisationName: data.organisationName,
    contactPersonName: data.contactPersonName,
    contactPhone: data.contactPhone,
    contactExtension: data.contactExtension,
    contactFax: data.contactFax,
  };

  for (const [key, placement] of Object.entries(guaranteeTextPlacements) as [
    GuaranteeTextPlacementKey,
    (typeof guaranteeTextPlacements)[GuaranteeTextPlacementKey],
  ][]) {
    drawSingleLine(ctx, target, key, values[key], placement);
    if (options.debug) drawDebug(ctx, target, key, placement);
  }

  if (data.missionType === 'embassy') {
    drawCheckbox(ctx, target, guaranteeCheckboxPlacements.missionEmbassy);
  }
  if (data.missionType === 'consulate') {
    drawCheckbox(ctx, target, guaranteeCheckboxPlacements.missionConsulate);
  }
  if (data.applicantGender === 'male') {
    drawCheckbox(ctx, target, guaranteeCheckboxPlacements.applicantGenderMale);
  }
  if (data.applicantGender === 'female') {
    drawCheckbox(ctx, target, guaranteeCheckboxPlacements.applicantGenderFemale);
  }

  if (options.debug) {
    Object.entries(guaranteeCheckboxPlacements).forEach(([key, placement]) => {
      drawDebug(ctx, target, key, placement);
    });
  }

  return target;
}
