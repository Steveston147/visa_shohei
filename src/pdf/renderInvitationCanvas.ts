import { deriveInvitationReasonData, type InvitationReasonData } from '../domain/invitationReasonData';
import { validateInvitationReasonData } from '../domain/invitationReasonValidation';
import {
  BACKGROUND_HEIGHT_PX,
  BACKGROUND_PATH,
  BACKGROUND_WIDTH_PX,
  CANVAS_FONT_FAMILY,
  FONT_PATH,
} from './constants';
import {
  assertCurrentA4PointConversion,
  drawCheckbox,
  drawDebug,
  drawMultiline,
  drawSingleLine,
  InvitationRenderError,
} from './canvasText';
import { checkboxPlacements, textPlacements, type TextPlacementKey } from './placements';

export type RenderInvitationCanvasOptions = {
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
    image.onerror = () => reject(new Error(BACKGROUND_PATH));
    image.src = BACKGROUND_PATH;
  }).catch((error) => {
    backgroundLoadPromise = null;
    throw error;
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

export async function renderInvitationCanvas(
  data: InvitationReasonData,
  options: RenderInvitationCanvasOptions = {},
) {
  const validationErrors = validateInvitationReasonData(data);
  if (validationErrors.length) {
    throw new InvitationRenderError('TEXT_OVERFLOW', validationErrors.join('\n'));
  }

  let image: HTMLImageElement;
  try {
    image = await loadBackgroundImage();
  } catch (error) {
    throw new InvitationRenderError('IMAGE_LOAD', '背景画像を読み込めませんでした。', error);
  }

  if (image.naturalWidth !== BACKGROUND_WIDTH_PX || image.naturalHeight !== BACKGROUND_HEIGHT_PX) {
    throw new InvitationRenderError(
      'IMAGE_DIMENSION',
      `背景画像サイズが不正です（${image.naturalWidth} x ${image.naturalHeight}）。`,
    );
  }

  await loadCanvasFont();

  const canvas = options.canvas ?? document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  assertCurrentA4PointConversion(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new InvitationRenderError('CANVAS_CONTEXT', 'Canvasを作成できませんでした。');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  const derived = deriveInvitationReasonData(data);
  const values: Record<TextPlacementKey, string> = {
    documentDateYear: derived.documentReiwaYear,
    documentDateMonth: derived.documentMonth,
    documentDateDay: derived.documentDay,
    diplomaticMission: data.diplomaticMission,
    inviterPostalCodeFirst3: derived.inviterPostalCodeFirst3,
    inviterPostalCodeLast4: derived.inviterPostalCodeLast4,
    inviterAddress: data.inviterAddress,
    inviterName: data.inviterName,
    inviterPhone: data.inviterPhone,
    inviterExtension: data.inviterExtension,
    organisationName: data.organisationName,
    contactPersonName: data.contactPersonName,
    contactPhone: data.contactPhone,
    contactExtension: data.contactExtension,
    applicantNationality: data.applicantNationality,
    applicantOccupation: data.applicantOccupation,
    applicantPassportName: data.applicantPassportName,
    additionalApplicantsCount: '',
    applicantDateOfBirthYear: derived.applicantBirthYear,
    applicantDateOfBirthMonth: derived.applicantBirthMonth,
    applicantDateOfBirthDay: derived.applicantBirthDay,
    applicantAge: derived.applicantAge,
    invitationPurpose: data.invitationPurpose,
    invitationBackground: data.invitationBackground,
    relationshipToApplicant: data.relationshipToApplicant,
  };

  for (const [key, placement] of Object.entries(textPlacements) as [
    TextPlacementKey,
    (typeof textPlacements)[TextPlacementKey],
  ][]) {
    if (placement.multiline) {
      drawMultiline(ctx, canvas, key, values[key], placement);
    } else {
      drawSingleLine(ctx, canvas, key, values[key], placement);
    }

    if (options.debug) drawDebug(ctx, canvas, key, placement);
  }

  if (data.applicantGender === 'male') {
    drawCheckbox(ctx, canvas, checkboxPlacements.applicantGenderMale);
  }
  if (data.applicantGender === 'female') {
    drawCheckbox(ctx, canvas, checkboxPlacements.applicantGenderFemale);
  }

  if (options.debug) {
    Object.entries(checkboxPlacements).forEach(([key, placement]) => {
      drawDebug(ctx, canvas, key, placement);
    });
  }

  return canvas;
}
