import { createHash } from 'node:crypto';
import {
  GUARANTEE_TEMPLATE_DATA_URL,
  GUARANTEE_TEMPLATE_HEIGHT,
  GUARANTEE_TEMPLATE_SHA256,
  GUARANTEE_TEMPLATE_WIDTH,
} from '../src/pdf/guaranteeTemplateData';

function fail(message: string): never {
  throw new Error(`Guarantee background validation failed: ${message}`);
}

const prefix = 'data:image/png;base64,';
if (!GUARANTEE_TEMPLATE_DATA_URL.startsWith(prefix)) {
  fail('the template is not a PNG data URL');
}

const bytes = Buffer.from(GUARANTEE_TEMPLATE_DATA_URL.slice(prefix.length), 'base64');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!bytes.subarray(0, 8).equals(pngSignature)) {
  fail('PNG signature is missing');
}

if (bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
  fail('IHDR is not the first PNG chunk');
}

const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
const bitDepth = bytes.readUInt8(24);
const colourType = bytes.readUInt8(25);
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (width !== GUARANTEE_TEMPLATE_WIDTH || height !== GUARANTEE_TEMPLATE_HEIGHT) {
  fail(`expected ${GUARANTEE_TEMPLATE_WIDTH} x ${GUARANTEE_TEMPLATE_HEIGHT}, received ${width} x ${height}`);
}
if (bitDepth !== 1 || colourType !== 0) {
  fail(`expected optimized 1-bit grayscale PNG, received bitDepth=${bitDepth}, colourType=${colourType}`);
}
if (sha256 !== GUARANTEE_TEMPLATE_SHA256) {
  fail(`SHA-256 mismatch: ${sha256}`);
}

console.log(
  `Guarantee background OK: ${width} x ${height}, ${bytes.length} bytes, SHA-256 ${sha256}`,
);
