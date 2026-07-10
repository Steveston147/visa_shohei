export type BatchApplicantInput = {
  sourceRow: number;
  passportName?: string;
  nationality?: string;
  occupation?: string;
  gender?: string;
  dateOfBirth?: string;
};

export type ReviewApplicantRow = Required<BatchApplicantInput> & {
  sequence: number;
  age: number | null;
  status: 'valid' | 'error';
  errors: string[];
};

export type BatchValidationResult = {
  reviewApplicants: ReviewApplicantRow[];
  validApplicants: ReviewApplicantRow[];
  validApplicantCount: number;
  canGenerateBatch: boolean;
};

const applicantRequiredFields: Array<keyof Omit<BatchApplicantInput, 'sourceRow'>> = [
  'passportName',
  'nationality',
  'occupation',
  'gender',
  'dateOfBirth',
];

function normalize(value: string | undefined) {
  return (value ?? '').trim();
}

function hasAnyApplicantValue(applicant: BatchApplicantInput) {
  return applicantRequiredFields.some((field) => normalize(applicant[field] as string | undefined));
}

export function calculateAge(dateOfBirth: string, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(birthDate.getTime())) return null;
  if (birthDate.getUTCFullYear() !== year || birthDate.getUTCMonth() !== month - 1 || birthDate.getUTCDate() !== day) return null;
  let age = today.getUTCFullYear() - year;
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age -= 1;
  return age >= 0 ? age : null;
}

function validateApplicant(applicant: Required<BatchApplicantInput>) {
  const errors: string[] = [];
  for (const field of applicantRequiredFields) {
    if (!applicant[field]) errors.push(`${field} is required.`);
  }
  if (applicant.gender && !['male', 'female'].includes(applicant.gender)) errors.push('gender must be male or female.');
  if (applicant.dateOfBirth && calculateAge(applicant.dateOfBirth) === null) errors.push('dateOfBirth must be a valid YYYY-MM-DD date.');
  if (applicant.passportName && !/^[A-Za-z '\-]+$/.test(applicant.passportName)) errors.push('passportName must use alphabetic characters, spaces, hyphens, or apostrophes.');
  return errors;
}

export function validateBatch(applicants: BatchApplicantInput[]): BatchValidationResult {
  const reviewApplicants = applicants
    .filter(hasAnyApplicantValue)
    .map((input, index) => {
      const applicant: Required<BatchApplicantInput> = {
        sourceRow: input.sourceRow,
        passportName: normalize(input.passportName),
        nationality: normalize(input.nationality),
        occupation: normalize(input.occupation),
        gender: normalize(input.gender),
        dateOfBirth: normalize(input.dateOfBirth),
      };
      const errors = validateApplicant(applicant);
      return {
        ...applicant,
        sequence: index + 1,
        age: calculateAge(applicant.dateOfBirth),
        status: errors.length ? 'error' : 'valid',
        errors,
      } satisfies ReviewApplicantRow;
    });
  const validApplicants = reviewApplicants.filter((applicant) => applicant.status === 'valid');
  return {
    reviewApplicants,
    validApplicants,
    validApplicantCount: validApplicants.length,
    canGenerateBatch: reviewApplicants.length > 0 && validApplicants.length === reviewApplicants.length,
  };
}
