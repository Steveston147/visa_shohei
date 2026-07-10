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
assert.equal(result.reviewApplicants.length, 0, '空行はreview一覧にも追加されない');

result = validateBatch(common, [applicant({ occupation: '' })]);
assert.equal(result.reviewApplicants.length, 1, '部分入力行はreview一覧に残る');
assert.equal(result.reviewApplicants[0].sourceRow, 2, 'Excel行番号を保持する');
assert.equal(result.reviewApplicants[0].status, 'error', '部分入力行はerror状態になる');
assert.equal(result.reviewApplicants[0].errors.length > 0, true, '部分入力行に行別エラーがある');
assert.equal(result.applicants.length, 0, '部分入力行は有効な申請人には含めない');
assert.equal(result.validApplicantCount, 0, '部分入力行は有効人数に含めない');
assert.equal(result.canGenerateBatch, false, 'errorがあればcanGenerateBatch=false');

const warning: ValidationIssue = { level: 'warning', scope: 'common', field: 'unknownKey', message: '不明なkeyです' };
result = validateBatch(common, [applicant()], [warning]);
assert.equal(result.reviewApplicants.length, 1, '有効行もreview一覧に表示する');
assert.equal(result.validApplicantCount, 1, '有効行を有効人数に含める');
assert.equal(result.canGenerateBatch, true, 'warningだけならcanGenerateBatch=true');

result = validateBatch({ ...common, documentDate: '' }, [applicant()]);
assert.equal(result.reviewApplicants[0].status, 'valid', '共通情報エラーだけなら申請人行自体は有効');
assert.equal(result.validApplicantCount, 1, '共通情報エラーでも申請人行自体の有効人数は保持する');
assert.equal(result.canGenerateBatch, false, '共通情報エラーがあれば一括生成不可');

result = validateBatch(common, [applicant({ sourceRow: 2, passportName: 'ZHANG WEI' }), applicant({ sourceRow: 3, passportName: 'ZHANG WEI' })]);
assert.equal(result.issues.some((issue) => issue.level === 'warning' && issue.field === 'passportName'), true, '重複氏名はwarning');
assert.equal(result.canGenerateBatch, true, '重複氏名warningだけならcanGenerateBatch=true');

console.log('Batch logic validation passed.');
