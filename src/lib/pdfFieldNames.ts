// This file is the single source of truth for the PDF field names.
// Replace the empty string values with the actual AcroForm field names discovered
// by `npm run inspect:pdf`. Do not guess field names elsewhere in the app.

export const pdfFieldNames = [] as const;

export const invitationReasonPdfFields = {
  documentDateEra: '',
  documentDateYear: '',
  documentDateMonth: '',
  documentDateDay: '',
  diplomaticMission: '',
  inviterPostalCodeFirst3: '',
  inviterPostalCodeLast4: '',
  inviterAddress: '',
  inviterName: '',
  inviterPhone: '',
  inviterExtension: '',
  organisationName: '',
  contactPersonName: '',
  contactPhone: '',
  contactExtension: '',
  applicantNationality: '',
  applicantOccupation: '',
  applicantPassportName: '',
  applicantGenderMale: '',
  applicantGenderFemale: '',
  applicantGenderOtherText: '',
  applicantDateOfBirthYear: '',
  applicantDateOfBirthMonth: '',
  applicantDateOfBirthDay: '',
  applicantAge: '',
  invitationPurpose: '',
  invitationBackground: '',
  relationshipToApplicant: '',
} as const;

export type InvitationReasonPdfFieldKey = keyof typeof invitationReasonPdfFields;
