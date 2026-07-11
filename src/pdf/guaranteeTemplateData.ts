import { GUARANTEE_TEMPLATE_PART_0 } from './guaranteeTemplatePart0';
import { GUARANTEE_TEMPLATE_PART_1_CHUNK_0 } from './guaranteeTemplatePart1Chunk0';
import { GUARANTEE_TEMPLATE_PART_1_CHUNK_1 } from './guaranteeTemplatePart1Chunk1';
import { GUARANTEE_TEMPLATE_PART_1_CHUNK_2 } from './guaranteeTemplatePart1Chunk2';
import { GUARANTEE_TEMPLATE_PART_1_CHUNK_3 } from './guaranteeTemplatePart1Chunk3';
import { GUARANTEE_TEMPLATE_PART_1_CHUNK_4 } from './guaranteeTemplatePart1Chunk4';
import { GUARANTEE_TEMPLATE_PART_2 } from './guaranteeTemplatePart2';
import { GUARANTEE_TEMPLATE_PART_3 } from './guaranteeTemplatePart3';
import { GUARANTEE_TEMPLATE_PART_4_CHUNK_0 } from './guaranteeTemplatePart4Chunk0';
import { GUARANTEE_TEMPLATE_PART_4_CHUNK_1 } from './guaranteeTemplatePart4Chunk1';
import { GUARANTEE_TEMPLATE_PART_4_CHUNK_2 } from './guaranteeTemplatePart4Chunk2';
import { GUARANTEE_TEMPLATE_PART_4_CHUNK_3 } from './guaranteeTemplatePart4Chunk3';

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
  GUARANTEE_TEMPLATE_PART_1_CHUNK_0,
  GUARANTEE_TEMPLATE_PART_1_CHUNK_1,
  GUARANTEE_TEMPLATE_PART_1_CHUNK_2,
  GUARANTEE_TEMPLATE_PART_1_CHUNK_3,
  GUARANTEE_TEMPLATE_PART_1_CHUNK_4,
  GUARANTEE_TEMPLATE_PART_2,
  GUARANTEE_TEMPLATE_PART_3,
  GUARANTEE_TEMPLATE_PART_4_CHUNK_0,
  GUARANTEE_TEMPLATE_PART_4_CHUNK_1,
  GUARANTEE_TEMPLATE_PART_4_CHUNK_2,
  GUARANTEE_TEMPLATE_PART_4_CHUNK_3,
].join('');

export const GUARANTEE_TEMPLATE_DATA_URL = `data:image/png;base64,${guaranteeTemplateBase64}`;
