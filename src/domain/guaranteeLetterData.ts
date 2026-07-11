import type { BatchApplicant, CommonInfo } from './batchApplicant';
import { calculateAgeFromDates } from './invitationReasonData';

export type MissionType = 'embassy' | 'consulate' | 'none';

export type GuaranteeLetterData = {
  documentNumber: string;
  documentDate: string;
  diplomaticMission: string;
  missionType: MissionType;

  applicantNationality: string;
  applicantOccupation: string;
  applicantPassportName: string;
  applicantGender: 'male' | 'female';
  applicantDateOfBirth: string;
  applicantAge: number;

  guarantorPostalCode: string;
  guarantorAddress: string;
  guarantorOccupation: string;
  guarantorName: string;
  guarantorDateOfBirth: string;
  guarantorAge: number | null;
  guarantorPhone: string;
  guarantorExtension: string;
  guarantorFax: string;
  relationshipToApplicant: string;

  organisationName: string;
  contactPersonName: string;
  contactPhone: string;
  contactExtension: string;
  contactFax: string;
};

export type GuaranteeLetterSettings = {
  missionType: MissionType;
  guarantorOccupation: string;
  guarantorName: string;
  guarantorDateOfBirth: string;
  guarantorFax: string;
  contactFax: string;
};

export const defaultGuaranteeLetterSettings: GuaranteeLetterSettings = {
  missionType: 'none',
  guarantorOccupation: '',
  guarantorName: '立命館大学　国際業務課課長　田中 猛',
  guarantorDateOfBirth: '',
  guarantorFax: '',
  contactFax: '',
};

/**
 * A deterministic preview record. It makes the official guarantee form visible
 * immediately, before an Excel file is uploaded or an applicant is selected.
 */
export const fixedGuaranteeLetterSample: GuaranteeLetterData = {
  documentNumber: '',
  documentDate: '2026-07-08',
  diplomaticMission: '上海',
  missionType: 'none',
  applicantNationality: 'China',
  applicantOccupation: 'Student',
  applicantPassportName: 'ZHANG WEI',
  applicantGender: 'male',
  applicantDateOfBirth: '2004-05-12',
  applicantAge: 22,
  guarantorPostalCode: '603-8577',
  guarantorAddress: '京都市北区等持院北町56-1',
  guarantorOccupation: '',
  guarantorName: defaultGuaranteeLetterSettings.guarantorName,
  guarantorDateOfBirth: '',
  guarantorAge: null,
  guarantorPhone: '075-466-3009',
  guarantorExtension: '511-4794',
  guarantorFax: '',
  relationshipToApplicant: '受入機関',
  organisationName: 'Ritsumeikan Study Abroad Center',
  contactPersonName: 'Takeshi Tanaka',
  contactPhone: '075-466-3009',
  contactExtension: '511-4794',
  contactFax: '',
};

export function toGuaranteeLetterData(
  common: CommonInfo,
  applicant: BatchApplicant,
  settings: GuaranteeLetterSettings = defaultGuaranteeLetterSettings,
): GuaranteeLetterData {
  const guarantorDateOfBirth = settings.guarantorDateOfBirth.trim();
  const guarantorAge = guarantorDateOfBirth
    ? calculateAgeFromDates(common.documentDate, guarantorDateOfBirth)
    : null;

  return {
    documentNumber: applicant.guaranteeDocumentNumber.trim(),
    documentDate: common.documentDate,
    diplomaticMission: common.diplomaticMission,
    missionType: settings.missionType,

    applicantNationality: applicant.nationality,
    applicantOccupation: applicant.occupation,
    applicantPassportName: applicant.passportName,
    applicantGender: applicant.gender,
    applicantDateOfBirth: applicant.dateOfBirth,
    applicantAge: applicant.calculatedAge,

    guarantorPostalCode: common.inviterPostalCode,
    guarantorAddress: common.inviterAddress,
    guarantorOccupation: settings.guarantorOccupation.trim(),
    guarantorName: settings.guarantorName.trim() || common.inviterName,
    guarantorDateOfBirth,
    guarantorAge,
    guarantorPhone: common.inviterPhone,
    guarantorExtension: common.inviterExtension,
    guarantorFax: settings.guarantorFax.trim(),
    relationshipToApplicant: common.relationshipToApplicant,

    organisationName: common.organisationName,
    contactPersonName: common.contactPersonName,
    contactPhone: common.contactPhone,
    contactExtension: common.contactExtension,
    contactFax: settings.contactFax.trim(),
  };
}

export function createGuaranteeLetterPdfFilename(applicant: BatchApplicant) {
  const safeName = applicant.passportName
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `GuaranteeLetter_${applicant.sequence.toString().padStart(2, '0')}_${safeName || 'Applicant'}.pdf`;
}
