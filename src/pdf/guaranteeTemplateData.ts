import { GUARANTEE_TEMPLATE_PART_0 } from './guaranteeTemplatePart0';
import { GUARANTEE_TEMPLATE_PART_1 } from './guaranteeTemplatePart1';
import { GUARANTEE_TEMPLATE_PART_2 } from './guaranteeTemplatePart2';
import { GUARANTEE_TEMPLATE_PART_3 } from './guaranteeTemplatePart3';
import { GUARANTEE_TEMPLATE_PART_4 } from './guaranteeTemplatePart4';

/**
 * Exact 300 dpi render of the official guarantee-letter PDF supplied by the user.
 * The dimensions and SHA-256 are verified in CI. Do not replace this with a
 * screenshot, resized image, or a hand-drawn approximation.
 */
export const GUARANTEE_TEMPLATE_WIDTH = 2481;
export const GUARANTEE_TEMPLATE_HEIGHT = 3508;
export const GUARANTEE_TEMPLATE_SHA256 = 'e6f909e5aa09754a00dc70a0570651cd98caf29eba8ffb909e9387f252966f33';

const guaranteeTemplateBase64 = [
  GUARANTEE_TEMPLATE_PART_0,
  GUARANTEE_TEMPLATE_PART_1,
  GUARANTEE_TEMPLATE_PART_2,
  GUARANTEE_TEMPLATE_PART_3,
  GUARANTEE_TEMPLATE_PART_4,
].join('');

export const GUARANTEE_TEMPLATE_DATA_URL = `data:image/png;base64,${guaranteeTemplateBase64}`;
