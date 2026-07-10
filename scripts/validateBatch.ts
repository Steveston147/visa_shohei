import assert from 'node:assert/strict';
import { validateBatch } from '../src/domain/batchValidation';

const result = validateBatch([
  {
    sourceRow: 2,
    passportName: 'ZHANG WEI',
    nationality: 'China',
    occupation: 'Student',
    gender: 'male',
    dateOfBirth: '2004-05-12',
  },
  {
    sourceRow: 3,
    passportName: 'PARTIAL APPLICANT',
    nationality: 'China',
  },
]);

assert.equal(result.reviewApplicants.length, 2, 'partially entered applicant row remains available for review');
assert.equal(result.reviewApplicants[1].sourceRow, 3, 'review row preserves Excel source row');
assert.equal(result.reviewApplicants[1].status, 'error', 'partial row has row-specific error status');
assert.ok(result.reviewApplicants[1].errors.length > 0, 'partial row has row-specific errors');
assert.equal(result.validApplicantCount, 1, 'partial row is not included in valid applicant count');
assert.equal(result.canGenerateBatch, false, 'partial row makes canGenerateBatch false');

console.log('validateBatch smoke tests passed');
