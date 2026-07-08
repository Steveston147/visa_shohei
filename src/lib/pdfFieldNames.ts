// This file is the single source of truth for semantic PDF field mappings.
// Fill values only after inspecting AcroForm widget rectangles with `npm run inspect:pdf`.
// Do not guess field names or rely only on AcroForm order.

export const pdfFieldNames = [] as const;

export const pdfFieldNameMap = {} as const;

export const invitationReasonPdfFields = {
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
  additionalApplicantsCount: '',
  applicantDateOfBirthYear: '',
  applicantDateOfBirthMonth: '',
  applicantDateOfBirthDay: '',
  applicantAge: '',
  invitationPurpose: '',
  invitationBackground: '',
  relationshipToApplicant: '',
} as const;

export type PdfFieldName = (typeof pdfFieldNames)[number];
export type InvitationReasonPdfFieldKey = keyof typeof invitationReasonPdfFields;
