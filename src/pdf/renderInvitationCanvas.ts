import { deriveInvitationReasonData, type InvitationReasonData } from '../domain/invitationReasonData';
import { validateInvitationReasonData } from '../domain/invitationReasonValidation';
import { BACKGROUND_HEIGHT_PX, BACKGROUND_PATH, BACKGROUND_WIDTH_PX, CANVAS_FONT_FAMILY, FONT_PATH } from './constants';
import { drawCheckbox, drawDebug, drawMultiline, drawSingleLine, InvitationRenderError } from './canvasText';
import { checkboxPlacements, textPlacements, type TextPlacementKey } from './placements';

export type RenderInvitationCanvasOptions = { canvas?: HTMLCanvasElement; debug?: boolean };
async function loadImage() { return new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = async () => { try { await img.decode?.(); resolve(img); } catch (e) { reject(e); } }; img.onerror = () => reject(new Error(BACKGROUND_PATH)); img.src = BACKGROUND_PATH; }); }
async function loadFont() { try { const face = new FontFace(CANVAS_FONT_FAMILY, `url(${FONT_PATH})`); await face.load(); document.fonts.add(face); await document.fonts.ready; if (!document.fonts.check(`12pt ${CANVAS_FONT_FAMILY}`)) throw new Error('document.fonts.check failed'); } catch (e) { throw new InvitationRenderError('FONT_LOAD', '日本語フォントを読み込めませんでした。', e); } }
export async function renderInvitationCanvas(data: InvitationReasonData, options: RenderInvitationCanvasOptions = {}) {
  const errors = validateInvitationReasonData(data); if (errors.length) throw new InvitationRenderError('TEXT_OVERFLOW', errors.join('\n'));
  let image: HTMLImageElement; try { image = await loadImage(); } catch (e) { throw new InvitationRenderError('IMAGE_LOAD', '背景画像を読み込めませんでした。', e); }
  if (image.naturalWidth !== BACKGROUND_WIDTH_PX || image.naturalHeight !== BACKGROUND_HEIGHT_PX) throw new InvitationRenderError('IMAGE_DIMENSION', `背景画像サイズが不正です（${image.naturalWidth} x ${image.naturalHeight}）。`);
  await loadFont(); const canvas = options.canvas ?? document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new InvitationRenderError('CANVAS_CONTEXT', 'Canvasを作成できませんでした。');
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
  const d = deriveInvitationReasonData(data);
  const values: Record<TextPlacementKey, string> = {
    documentDateYear: d.documentReiwaYear, documentDateMonth: d.documentMonth, documentDateDay: d.documentDay, diplomaticMission: data.diplomaticMission,
    inviterPostalCodeFirst3: d.inviterPostalCodeFirst3, inviterPostalCodeLast4: d.inviterPostalCodeLast4, inviterAddress: data.inviterAddress, inviterName: data.inviterName,
    inviterPhone: data.inviterPhone, inviterExtension: data.inviterExtension, organisationName: data.organisationName, contactPersonName: data.contactPersonName,
    contactPhone: data.contactPhone, contactExtension: data.contactExtension, applicantNationality: data.applicantNationality, applicantOccupation: data.applicantOccupation,
    applicantPassportName: data.applicantPassportName, additionalApplicantsCount: '', applicantDateOfBirthYear: d.applicantBirthYear, applicantDateOfBirthMonth: d.applicantBirthMonth,
    applicantDateOfBirthDay: d.applicantBirthDay, applicantAge: d.applicantAge, invitationPurpose: data.invitationPurpose, invitationBackground: data.invitationBackground, relationshipToApplicant: data.relationshipToApplicant,
  };
  for (const [key, placement] of Object.entries(textPlacements) as [TextPlacementKey, typeof textPlacements[TextPlacementKey]][]) {
    if (placement.multiline) drawMultiline(ctx, canvas, key, values[key], placement); else drawSingleLine(ctx, canvas, key, values[key], placement);
    if (options.debug) drawDebug(ctx, canvas, key, placement);
  }
  if (data.applicantGender === 'male') drawCheckbox(ctx, canvas, checkboxPlacements.applicantGenderMale);
  if (data.applicantGender === 'female') drawCheckbox(ctx, canvas, checkboxPlacements.applicantGenderFemale);
  if (options.debug) Object.entries(checkboxPlacements).forEach(([key, placement]) => drawDebug(ctx, canvas, key, placement));
  return canvas;
}
