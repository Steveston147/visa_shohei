import type { BatchApplicant, CommonInfo } from './batchApplicant';
import type { InvitationReasonData } from './invitationReasonData';

export function toInvitationReasonData(common: CommonInfo, applicant: BatchApplicant): InvitationReasonData {
  return {
    programName: common.programName,
    documentDate: common.documentDate,
    diplomaticMission: common.diplomaticMission,
    inviterPostalCode: common.inviterPostalCode,
    inviterAddress: common.inviterAddress,
    inviterName: common.inviterName,
    inviterPhone: common.inviterPhone,
    inviterExtension: common.inviterExtension,
    organisationName: common.organisationName,
    contactPersonName: common.contactPersonName,
    contactPhone: common.contactPhone,
    contactExtension: common.contactExtension,
    applicantPassportName: applicant.passportName,
    applicantNationality: applicant.nationality,
    applicantOccupation: applicant.occupation,
    applicantGender: applicant.gender,
    applicantDateOfBirth: applicant.dateOfBirth,
    invitationPurpose: common.invitationPurpose,
    invitationBackground: common.invitationBackground,
    relationshipToApplicant: common.relationshipToApplicant,
    additionalApplicantsCount: '',
  };
}

export function createInvitationReasonPdfFilename(applicant: BatchApplicant) {
  const sequence = applicant.sequence.toString().padStart(3, '0');
  const safeName = applicant.passportName
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'Applicant';
  return `${sequence}_InvitationReason_${safeName}.pdf`;
}
