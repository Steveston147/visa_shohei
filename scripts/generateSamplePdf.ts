import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFCheckBox, PDFDocument, PDFForm, PDFFont, PDFTextField } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { invitationReasonPdfFields, type InvitationReasonPdfFieldKey } from '../src/lib/pdfFieldNames';

const sampleData = {
  programName: 'Ritsumeikan Short-term Study Program',
  documentDate: '2026-07-08',
  diplomaticMission: '上海',
  postalCode: '603-8577',
  address: '京都市北区等持院北町56-1',
  inviterName: '田中 猛',
  inviterPhone: '075-466-3009',
  inviterExtension: '511-4794',
  organisationName: 'Ritsumeikan Study Abroad Center',
  contactPersonName: 'Takeshi Tanaka',
  contactPhone: '075-466-3009',
  contactExtension: '511-4794',
  passportName: 'ZHANG WEI',
  nationality: 'China',
  occupation: 'Student',
  gender: 'male' as 'male' | 'female',
  dateOfBirth: '2004-05-12',
  invitationPurpose: '短期留学生受入プログラムに参加するため',
  invitationBackground: '協定校から推薦された学生を受け入れるため',
  relationshipToApplicant: '受入機関',
};
function parseDate(value: string) { const [y,m,d]=value.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function toReiwaYear(date: Date) { return date.getUTCFullYear() - 2018; }
function calculateAge(onDate: Date, birthDate: Date) { let age=onDate.getUTCFullYear()-birthDate.getUTCFullYear(); if (onDate.getTime()<Date.UTC(onDate.getUTCFullYear(),birthDate.getUTCMonth(),birthDate.getUTCDate())) age--; return age; }
function getFieldName(key: InvitationReasonPdfFieldKey) { const name=invitationReasonPdfFields[key]; if (!name) throw new Error(`Unmapped field: ${key}`); return name; }
function setText(form: PDFForm, key: InvitationReasonPdfFieldKey, value: string, font: PDFFont) { const f=form.getField(getFieldName(key)); if (!(f instanceof PDFTextField)) throw new Error(`${key} is not text`); f.setText(value); f.updateAppearances(font); }
function setCheckbox(form: PDFForm, key: InvitationReasonPdfFieldKey, checked: boolean) { const f=form.getField(getFieldName(key)); if (!(f instanceof PDFCheckBox)) throw new Error(`${key} is not checkbox`); checked ? f.check() : f.uncheck(); }
async function main() {
  const pdfDoc = await PDFDocument.load(await readFile('public/templates/shouhei-riyusho.pdf'));
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(await readFile('public/fonts/NotoSansJP-Regular.ttf'), { subset: true });
  const form = pdfDoc.getForm();
  const documentDate=parseDate(sampleData.documentDate); const birthDate=parseDate(sampleData.dateOfBirth); const [postalFirst3, postalLast4]=sampleData.postalCode.split('-');
  setText(form,'documentDateYear',String(toReiwaYear(documentDate)),font); setText(form,'documentDateMonth',String(documentDate.getUTCMonth()+1),font); setText(form,'documentDateDay',String(documentDate.getUTCDate()),font);
  setText(form,'diplomaticMission',sampleData.diplomaticMission,font); setText(form,'inviterPostalCodeFirst3',postalFirst3,font); setText(form,'inviterPostalCodeLast4',postalLast4,font); setText(form,'inviterAddress',sampleData.address,font); setText(form,'inviterName',sampleData.inviterName,font); setText(form,'inviterPhone',sampleData.inviterPhone,font); setText(form,'inviterExtension',sampleData.inviterExtension,font); setText(form,'organisationName',sampleData.organisationName,font); setText(form,'contactPersonName',sampleData.contactPersonName,font); setText(form,'contactPhone',sampleData.contactPhone,font); setText(form,'contactExtension',sampleData.contactExtension,font);
  setText(form,'applicantNationality',sampleData.nationality,font); setText(form,'applicantOccupation',sampleData.occupation,font); setText(form,'applicantPassportName',sampleData.passportName,font); setCheckbox(form,'applicantGenderMale',sampleData.gender==='male'); setCheckbox(form,'applicantGenderFemale',sampleData.gender==='female'); setText(form,'additionalApplicantsCount','',font);
  setText(form,'applicantDateOfBirthYear',String(birthDate.getUTCFullYear()),font); setText(form,'applicantDateOfBirthMonth',String(birthDate.getUTCMonth()+1),font); setText(form,'applicantDateOfBirthDay',String(birthDate.getUTCDate()),font); setText(form,'applicantAge',String(calculateAge(documentDate,birthDate)),font);
  setText(form,'invitationPurpose',sampleData.invitationPurpose,font); setText(form,'invitationBackground',sampleData.invitationBackground,font); setText(form,'relationshipToApplicant',sampleData.relationshipToApplicant,font);
  form.flatten();
  const out=path.join('generated','InvitationReason_Ritsumeikan_Short-term_Study_Program_ZHANG_WEI.pdf'); await mkdir(path.dirname(out),{recursive:true}); await writeFile(out, await pdfDoc.save()); console.log(out);
}
main();
