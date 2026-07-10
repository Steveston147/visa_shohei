import type { BatchApplicant, CommonInfo } from './batchApplicant';

export type GuaranteeLetterData = {
  documentDate: string;
  diplomaticMission: string;
  missionType: 'embassy' | 'consulate';

  applicantNationality: string;
  applicantOccupation: string;
  applicantPassportName: string;
  applicantGender: 'male' | 'female';
  applicantDateOfBirth: string;
  applicantAge: number;
  additionalApplicantsCount: number;

  guarantorPostalCode: string;
  guarantorAddress: string;
  guarantorOccupation: string;
  guarantorName: string;
  guarantorDateOfBirth: string;
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

export type GuaranteeLetterDefaults = Pick<
  GuaranteeLetterData,
  | 'missionType'
  | 'guarantorOccupation'
  | 'guarantorDateOfBirth'
  | 'guarantorFax'
  | 'contactFax'
>;

export const defaultGuaranteeLetterDefaults: GuaranteeLetterDefaults = {
  missionType: 'consulate',
  guarantorOccupation: '',
  guarantorDateOfBirth: '',
  guarantorFax: '',
  contactFax: '',
};

export function toGuaranteeLetterData(
  common: CommonInfo,
  applicant: BatchApplicant,
  defaults: GuaranteeLetterDefaults = defaultGuaranteeLetterDefaults,
): GuaranteeLetterData {
  return {
    documentDate: common.documentDate,
    diplomaticMission: common.diplomaticMission,
    missionType: defaults.missionType,

    applicantNationality: applicant.nationality,
    applicantOccupation: applicant.occupation,
    applicantPassportName: applicant.passportName,
    applicantGender: applicant.gender,
    applicantDateOfBirth: applicant.dateOfBirth,
    applicantAge: applicant.calculatedAge,
    additionalApplicantsCount: 0,

    guarantorPostalCode: common.inviterPostalCode,
    guarantorAddress: common.inviterAddress,
    guarantorOccupation: defaults.guarantorOccupation,
    guarantorName: common.inviterName,
    guarantorDateOfBirth: defaults.guarantorDateOfBirth,
    guarantorPhone: common.inviterPhone,
    guarantorExtension: common.inviterExtension,
    guarantorFax: defaults.guarantorFax,
    relationshipToApplicant: common.relationshipToApplicant,

    organisationName: common.organisationName,
    contactPersonName: common.contactPersonName,
    contactPhone: common.contactPhone,
    contactExtension: common.contactExtension,
    contactFax: defaults.contactFax,
  };
}

export function createGuaranteeLetterPdfFilename(applicant: BatchApplicant) {
  const safeName = applicant.passportName
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `GuaranteeLetter_${applicant.sequence.toString().padStart(2, '0')}_${safeName || 'Applicant'}.pdf`;
}
