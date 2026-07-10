import { strict as assert } from 'node:assert';
import { calculateAge, normalizeDateInput, normalizeGender, validateBatch, type ApplicantDraft, type CommonInfo, type ValidationIssue } from '../src/domain/batchApplicant';

const common: CommonInfo = {
  programName: 'Ritsumeikan Short-term Study Program', documentDate: '2026-07-08', diplomaticMission: '上海', inviterPostalCode: '603-8577', inviterAddress: '京都市北区等持院北町56-1', inviterName: '田中 猛', inviterPhone: '075-466-3009', inviterExtension: '', organisationName: 'Ritsumeikan Study Abroad Center', contactPersonName: 'Takeshi Tanaka', contactPhone: '075-466-3009', contactExtension: '', invitationPurpose: '短期留学生受入プログラムに参加するため', invitationBackground: '協定校から推薦された学生を受け入れるため', relationshipToApplicant: '受入機関',
};

function applicant(overrides: Partial<ApplicantDraft> = {}): ApplicantDraft {
  return { sourceRow: 2, nationality: 'China', occupation: 'Student', passportName: 'ZHANG WEI', gender: 'Male', dateOfBirth: '2004-05-12', ...overrides };
}

assert.equal(calculateAge('2026-07-08', '2004-05-12'), 22, '誕生日が今年すでに来ている');
assert.equal(calculateAge('2026-04-01', '2004-05-12'), 21, '誕生日が今年まだ来ていない');
assert.equal(calculateAge('2026-05-12', '2004-05-12'), 22, '作成日が誕生日当日');
assert.equal(normalizeDateInput('2026-7-8'), null);
assert.equal(normalizeDateInput('2026/7/8'), '2026-07-08');
assert.equal(normalizeDateInput('2026-02-30'), null);
assert.equal(normalizeDateInput('05/12/2004'), null);
assert.equal(normalizeDateInput(38910, () => ({ y: 2006, m: 7, d: 12 })), '2006-07-12');
assert.equal(normalizeGender('M'), 'male');
assert.equal(normalizeGender('女'), 'female');
assert.equal(normalizeGender('unknown'), null);

let result = validateBatch(common, []);
assert.equal(result.loadedApplicantRows, 0, 'No.だけの行はparser側で無視され、validationには渡されない');

result = validateBatch(common, [applicant({ occupation: '' })]);
assert.equal(result.issues.some((issue) => issue.level === 'error' && issue.scope === 'applicant' && issue.sourceRow === 2), true, '部分入力行はerror');
assert.equal(result.canGenerateBatch, false, 'errorがあればcanGenerateBatch=false');

const warning: ValidationIssue = { level: 'warning', scope: 'common', field: 'unknownKey', message: '不明なkeyです' };
result = validateBatch(common, [applicant()], [warning]);
assert.equal(result.canGenerateBatch, true, 'warningだけならcanGenerateBatch=true');

result = validateBatch(common, [applicant({ sourceRow: 2, passportName: 'ZHANG WEI' }), applicant({ sourceRow: 3, passportName: 'ZHANG WEI' })]);
assert.equal(result.issues.some((issue) => issue.level === 'warning' && issue.field === 'passportName'), true, '重複氏名はwarning');
assert.equal(result.canGenerateBatch, true, '重複氏名warningだけならcanGenerateBatch=true');

console.log('Batch logic validation passed.');
