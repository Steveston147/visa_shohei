import { strict as assert } from 'node:assert';
import type { BatchApplicant, CommonInfo } from '../src/domain/batchApplicant';
import { toGuaranteeLetterData, type GuaranteeLetterSettings } from '../src/domain/guaranteeLetterData';

const common: CommonInfo = {
  programName: 'Test Program',
  documentDate: '2026-07-11',
  diplomaticMission: 'Vancouver',
  inviterPostalCode: '603-8577',
  inviterAddress: '京都市北区等持院北町56-1',
  inviterName: '田中 猛',
  inviterPhone: '075-466-3009',
  inviterExtension: '511-4794',
  organisationName: 'Ritsumeikan Study Abroad Center',
  contactPersonName: 'Takeshi Tanaka',
  contactPhone: '075-466-3009',
  contactExtension: '511-4794',
  invitationPurpose: 'Study',
  invitationBackground: 'Exchange',
  relationshipToApplicant: '受入機関',
};

const applicant: BatchApplicant = {
  sequence: 1,
  sourceRow: 2,
  documentNumber: '',
  nationality: 'Canada',
  occupation: 'Student',
  passportName: 'TEST STUDENT',
  gender: 'female',
  dateOfBirth: '2004-08-03',
  calculatedAge: 21,
};

const settings: GuaranteeLetterSettings = {
  missionType: 'none',
  guarantorOccupation: '',
  guarantorName: '立命館大学　国際業務課課長　田中 猛',
  guarantorDateOfBirth: '1968-04-27',
  guarantorFax: '',
  contactFax: '',
};

const result = toGuaranteeLetterData(common, applicant, settings);
assert.equal(result.applicantPassportName, 'TEST STUDENT');
assert.equal(result.guarantorName, settings.guarantorName);
assert.equal(result.guarantorAge, 58);
assert.equal(result.missionType, 'none');
assert.equal('additionalApplicantsCount' in result, false);
console.log('Guarantee letter mapping validation passed.');
