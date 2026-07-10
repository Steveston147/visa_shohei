export type ApplicantGender = 'male' | 'female';

export type InvitationReasonData = {
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
  applicantPassportName: string;
  applicantNationality: string;
  applicantOccupation: string;
  applicantGender: ApplicantGender;
  applicantDateOfBirth: string;
  invitationPurpose: string;
  invitationBackground: string;
  relationshipToApplicant: string;
  additionalApplicantsCount: '';
};

export type DerivedInvitationReasonData = {
  documentReiwaYear: string;
  documentMonth: string;
  documentDay: string;
  applicantBirthYear: string;
  applicantBirthMonth: string;
  applicantBirthDay: string;
  applicantAge: string;
  inviterPostalCodeFirst3: string;
  inviterPostalCodeLast4: string;
};

export const fixedInvitationReasonSample: InvitationReasonData = {
  programName: 'Ritsumeikan Short-term Study Program',
  documentDate: '2026-07-08',
  diplomaticMission: '上海',
  inviterPostalCode: '603-8577',
  inviterAddress: '京都市北区等持院北町56-1',
  inviterName: '田中 猛',
  inviterPhone: '075-466-3009',
  inviterExtension: '511-4794',
  organisationName: 'Ritsumeikan Study Abroad Center',
  contactPersonName: 'Takeshi Tanaka',
  contactPhone: '075-466-3009',
  contactExtension: '511-4794',
  applicantPassportName: 'ZHANG WEI',
  applicantNationality: 'China',
  applicantOccupation: 'Student',
  applicantGender: 'male',
  applicantDateOfBirth: '2004-05-12',
  invitationPurpose: '短期留学生受入プログラムに参加するため',
  invitationBackground: '協定校から推薦された学生を受け入れるため',
  relationshipToApplicant: '受入機関',
  additionalApplicantsCount: '',
};

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
function toReiwaYear(date: Date) {
  if (date.getTime() < Date.UTC(2019, 4, 1)) throw new Error('令和より前の日付は対応していません。');
  return date.getUTCFullYear() - 2018;
}
function calculateAge(onDate: Date, birthDate: Date) {
  let age = onDate.getUTCFullYear() - birthDate.getUTCFullYear();
  if (onDate.getTime() < Date.UTC(onDate.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate())) age -= 1;
  return age;
}
export function deriveInvitationReasonData(data: InvitationReasonData): DerivedInvitationReasonData {
  const documentDate = parseDate(data.documentDate);
  const birthDate = parseDate(data.applicantDateOfBirth);
  const [inviterPostalCodeFirst3 = '', inviterPostalCodeLast4 = ''] = data.inviterPostalCode.split('-');
  return {
    documentReiwaYear: String(toReiwaYear(documentDate)),
    documentMonth: String(documentDate.getUTCMonth() + 1),
    documentDay: String(documentDate.getUTCDate()),
    applicantBirthYear: String(birthDate.getUTCFullYear()),
    applicantBirthMonth: String(birthDate.getUTCMonth() + 1),
    applicantBirthDay: String(birthDate.getUTCDate()),
    applicantAge: String(calculateAge(documentDate, birthDate)),
    inviterPostalCodeFirst3,
    inviterPostalCodeLast4,
  };
}
export const invitationReasonDownloadBaseName = 'InvitationReason_Ritsumeikan_Short-term_Study_Program_ZHANG_WEI';
