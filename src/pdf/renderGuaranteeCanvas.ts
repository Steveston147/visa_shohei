import guaranteeLetterBackground from '../../public/templates/guarantee-letter-template.png';
import type { GuaranteeLetterData } from '../domain/guaranteeLetterData';
import {
  BACKGROUND_HEIGHT_PX,
  BACKGROUND_WIDTH_PX,
  CANVAS_FONT_FAMILY,
  FONT_PATH,
} from './constants';
import {
  assertCurrentA4PointConversion,
  drawCheckbox,
  drawSingleLine,
  InvitationRenderError,
} from './canvasText';
import {
  guaranteeCheckboxPlacements,
  guaranteeTextPlacements,
  type GuaranteeTextPlacementKey,
} from './guaranteePlacements';

export const GUARANTEE_CANVAS_WIDTH = BACKGROUND_WIDTH_PX;
export const GUARANTEE_CANVAS_HEIGHT = BACKGROUND_HEIGHT_PX;

// Import the official form as a Next.js static asset instead of relying on a
// root-relative public URL. This makes the image part of the deployment output
// and gives it a hashed URL on Vercel.
export const GUARANTEE_BACKGROUND_PATH = guaranteeLetterBackground.src;

let backgroundLoadPromise: Promise<HTMLImageElement> | null = null;
let fontLoadPromise: Promise<void> | null = null;

function loadBackgroundImage() {
  if (backgroundLoadPromise) return backgroundLoadPromise;

  backgroundLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${GUARANTEE_BACKGROUND_PATH}`));
    image.src = GUARANTEE_BACKGROUND_PATH;
  }).then((image) => {
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new InvitationRenderError(
        'IMAGE_DIMENSION',
        '身元保証書の正式様式の画像サイズを確認できませんでした。',
      );
    }

    const sourceAspectRatio = image.naturalWidth / image.naturalHeight;
    const a4AspectRatio = GUARANTEE_CANVAS_WIDTH / GUARANTEE_CANVAS_HEIGHT;
    if (Math.abs(sourceAspectRatio - a4AspectRatio) > 0.02) {
      throw new InvitationRenderError(
        'IMAGE_DIMENSION',
        `身元保証書の正式様式がA4比率ではありません（${image.naturalWidth} x ${image.naturalHeight}）。`,
      );
    }

    return image;
  }).catch((error) => {
    backgroundLoadPromise = null;
    if (error instanceof InvitationRenderError) throw error;
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
  canvas?: HTMLCanvasElement,
) {
  const [image] = await Promise.all([loadBackgroundImage(), loadCanvasFont()]);

  const target = canvas ?? document.createElement('canvas');
  target.width = GUARANTEE_CANVAS_WIDTH;
  target.height = GUARANTEE_CANVAS_HEIGHT;
  assertCurrentA4PointConversion(target);

  const ctx = target.getContext('2d');
  if (!ctx) {
    throw new InvitationRenderError('CANVAS_CONTEXT', '身元保証書Canvasを作成できませんでした。');
  }

  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(image, 0, 0, target.width, target.height);

  const documentDate = dateParts(data.documentDate);
  const applicantBirthDate = dateParts(data.applicantDateOfBirth);
  const guarantorBirthDate = dateParts(data.guarantorDateOfBirth);

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
    applicantAge: data.applicantAge === null ? '' : String(data.applicantAge),
    guarantorPostalCode: data.guarantorPostalCode,
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

  return target;
}
