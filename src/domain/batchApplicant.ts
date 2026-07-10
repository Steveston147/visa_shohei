import { calculateAgeFromDates } from './invitationReasonData';

export type BatchGender = 'male' | 'female';
export type IssueLevel = 'error' | 'warning';
export type IssueScope = 'common' | 'applicant';

export type ValidationIssue = {
  level: IssueLevel;
  scope: IssueScope;
  sourceRow?: number;
  field: string;
  message: string;
};

export type CommonInfo = {
  programName: string;
  documentDate: string;
  diplomaticMission: string;
  inviterPostalCode: string;
  inviterAddress: string;
  inviterName: string;
  inviterPhone: string;
  inviterExtension: string;
  organisationName: string;
  contactPersonName: string;
  contactPhone: string;
  contactExtension: string;
  invitationPurpose: string;
  invitationBackground: string;
  relationshipToApplicant: string;
};

export type BatchApplicant = {
  sequence: number;
  sourceRow: number;
  nationality: string;
  occupation: string;
  passportName: string;
  gender: BatchGender;
  dateOfBirth: string;
  calculatedAge: number;
};

export type ReviewApplicant = {
  sequence: number;
  sourceRow: number;
  nationality: string;
  occupation: string;
  passportName: string;
  gender: string;
  dateOfBirth: string;
  calculatedAge: number | null;
  status: 'valid' | 'error';
  errors: string[];
};

export type ApplicantDraft = {
  sourceRow: number;
  nationality: string;
  occupation: string;
  passportName: string;
  gender: string;
  dateOfBirth: string;
};

export type BatchParseResult = {
  fileName: string;
  common: Partial<CommonInfo>;
  reviewApplicants: ReviewApplicant[];
  applicants: BatchApplicant[];
  issues: ValidationIssue[];
  loadedApplicantRows: number;
  validApplicantCount: number;
  canGenerateBatch: boolean;
};

export const commonInfoFields = [
  'programName', 'documentDate', 'diplomaticMission', 'inviterPostalCode', 'inviterAddress', 'inviterName', 'inviterPhone', 'inviterExtension',
  'organisationName', 'contactPersonName', 'contactPhone', 'contactExtension', 'invitationPurpose', 'invitationBackground', 'relationshipToApplicant',
] as const;

export const optionalCommonKeys = new Set<keyof CommonInfo>(['inviterExtension', 'contactExtension']);
export const requiredCommonKeys = commonInfoFields.filter((key) => !optionalCommonKeys.has(key));

const fieldLabels: Record<keyof CommonInfo, string> = {
  programName: 'プログラム名', documentDate: '作成日', diplomaticMission: '宛先公館', inviterPostalCode: '招へい人郵便番号', inviterAddress: '招へい人住所', inviterName: '招へい人氏名', inviterPhone: '招へい人電話番号', inviterExtension: '招へい人内線', organisationName: '担当者所属先名', contactPersonName: '担当者氏名', contactPhone: '担当者電話番号', contactExtension: '担当者内線', invitationPurpose: '招へい目的', invitationBackground: '招へい経緯', relationshipToApplicant: '申請人との関係',
};
export function getCommonFieldLabel(key: string) { return fieldLabels[key as keyof CommonInfo] ?? key; }

export function formatDateParts(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function isRealDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeDateInput(value: unknown, parseSerial?: (value: number) => { y: number; m: number; d: number } | null): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = parseSerial?.(value);
    return parsed && isRealDate(parsed.y, parsed.m, parsed.d) ? formatDateParts(parsed.y, parsed.m, parsed.d) : null;
  }
  const text = String(value ?? '').trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) {
    const [, y, m, d] = match.map(Number);
    return isRealDate(y, m, d) ? formatDateParts(y, m, d) : null;
  }
  match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(text);
  if (match) {
    const [, y, m, d] = match.map(Number);
    return isRealDate(y, m, d) ? formatDateParts(y, m, d) : null;
  }
  return null;
}

export function normalizeGender(value: unknown): BatchGender | null {
  const text = String(value ?? '').trim();
  if (['Male', 'male', 'M', '男'].includes(text)) return 'male';
  if (['Female', 'female', 'F', '女'].includes(text)) return 'female';
  return null;
}

export function calculateAge(documentDate: string, dateOfBirth: string) {
  return calculateAgeFromDates(documentDate, dateOfBirth);
}

export function validateBatch(common: Partial<CommonInfo>, drafts: ApplicantDraft[], baseIssues: ValidationIssue[] = []): Omit<BatchParseResult, 'fileName'> {
  const issues = [...baseIssues];
  for (const key of requiredCommonKeys) {
    if (!(key in common)) issues.push({ level: 'error', scope: 'common', field: key, message: `必須keyがありません: ${key}` });
    else if (!String(common[key] ?? '').trim()) issues.push({ level: 'error', scope: 'common', field: key, message: `必須値が空欄です: ${getCommonFieldLabel(key)}` });
  }
  if ('additionalApplicantsCount' in common) issues.push({ level: 'error', scope: 'common', field: 'additionalApplicantsCount', message: 'additionalApplicantsCount はExcelに入力しないでください。' });
  if (common.documentDate && !normalizeDateInput(common.documentDate)) issues.push({ level: 'error', scope: 'common', field: 'documentDate', message: '作成日は実在する YYYY-MM-DD または YYYY/M/D で入力してください。' });

  const documentDate = common.documentDate && normalizeDateInput(common.documentDate);
  const reviewApplicants: ReviewApplicant[] = [];
  const applicants: BatchApplicant[] = [];
  const nameCounts = new Map<string, number>();

  for (const draft of drafts) {
    const sequence = reviewApplicants.length + 1;
    const nationality = draft.nationality.trim();
    const occupation = draft.occupation.trim();
    const passportName = draft.passportName.trim();
    const genderInput = draft.gender.trim();
    const dateOfBirthInput = draft.dateOfBirth.trim();
    const rowIssues: ValidationIssue[] = [];

    if (!nationality) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'nationality', message: '国籍は必須です。' });
    if (!occupation) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'occupation', message: '職業は必須です。' });
    if (!passportName) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'passportName', message: '氏名は必須です。' });
    else if (!/^[A-Za-z '\-]+$/.test(passportName)) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'passportName', message: '氏名は英字、空白、ハイフン、アポストロフィのみで入力してください。' });

    const gender = normalizeGender(genderInput);
    if (!genderInput) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'gender', message: '性別は必須です。' });
    else if (!gender) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'gender', message: '性別は Male/male/M/男 または Female/female/F/女 で入力してください。' });

    const dateOfBirth = normalizeDateInput(dateOfBirthInput);
    if (!dateOfBirthInput) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'dateOfBirth', message: '生年月日は必須です。' });
    else if (!dateOfBirth) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'dateOfBirth', message: '生年月日は実在する YYYY-MM-DD または YYYY/M/D で入力してください。曖昧な形式は使えません。' });

    let calculatedAge: number | null = null;
    if (documentDate && dateOfBirth) {
      calculatedAge = calculateAge(documentDate, dateOfBirth);
      if (dateOfBirth > documentDate) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'dateOfBirth', message: '生年月日は作成日以前で入力してください。' });
      if (calculatedAge < 0 || calculatedAge > 120) rowIssues.push({ level: 'error', scope: 'applicant', sourceRow: draft.sourceRow, field: 'dateOfBirth', message: '年齢は0～120歳の範囲である必要があります。' });
    }

    if (passportName) {
      const key = passportName.toUpperCase();
      nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }

    issues.push(...rowIssues);
    const rowErrors = rowIssues.filter((issue) => issue.level === 'error');
    const status: ReviewApplicant['status'] = rowErrors.length ? 'error' : 'valid';
    reviewApplicants.push({
      sequence,
      sourceRow: draft.sourceRow,
      nationality,
      occupation,
      passportName,
      gender: gender ?? genderInput,
      dateOfBirth: dateOfBirth ?? dateOfBirthInput,
      calculatedAge,
      status,
      errors: rowErrors.map((issue) => issue.message),
    });

    if (status === 'valid' && gender && dateOfBirth && calculatedAge !== null) {
      applicants.push({ sequence, sourceRow: draft.sourceRow, nationality, occupation, passportName, gender, dateOfBirth, calculatedAge });
    }
  }

  for (const [name, count] of nameCounts) {
    if (count > 1) issues.push({ level: 'warning', scope: 'applicant', field: 'passportName', message: `同じパスポート氏名が複数あります: ${name}` });
  }

  const hasError = issues.some((issue) => issue.level === 'error');
  const validApplicantCount = reviewApplicants.filter((applicant) => applicant.status === 'valid').length;
  return {
    common,
    reviewApplicants,
    applicants,
    issues,
    loadedApplicantRows: reviewApplicants.length,
    validApplicantCount,
    canGenerateBatch: reviewApplicants.length > 0 && !hasError && applicants.length === reviewApplicants.length,
  };
}
