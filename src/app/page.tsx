'use client';

import fontkit from '@pdf-lib/fontkit';
import { useState } from 'react';
import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFFont } from 'pdf-lib';
import { invitationReasonPdfFields, type InvitationReasonPdfFieldKey } from '../lib/pdfFieldNames';

const templatePath = '/templates/shouhei-riyusho.pdf';
const fontPath = '/fonts/NotoSansJP-Regular.ttf';

const sampleData = {
  programName: 'Ritsumeikan Short-term Study Program',
  documentDate: '2026-07-08',
  diplomaticMission: '在上海日本国総領事館',
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
  gender: 'male' as 'male' | 'female' | 'other',
  dateOfBirth: '2004-05-12',
  invitationPurpose: '短期留学生受入プログラムに参加するため',
  invitationBackground: '協定校から推薦された学生を受け入れるため',
  relationshipToApplicant: '受入機関',
};

const requiredFieldLabels: Record<InvitationReasonPdfFieldKey, string> = {
  documentDateEra: '作成年号',
  documentDateYear: '作成年',
  documentDateMonth: '作成月',
  documentDateDay: '作成日',
  diplomaticMission: '宛先公館',
  inviterPostalCodeFirst3: '招へい人郵便番号（前3桁）',
  inviterPostalCodeLast4: '招へい人郵便番号（後4桁）',
  inviterAddress: '招へい人住所',
  inviterName: '招へい人氏名',
  inviterPhone: '招へい人電話番号',
  inviterExtension: '招へい人内線',
  organisationName: '所属機関名',
  contactPersonName: '担当者氏名',
  contactPhone: '担当者電話番号',
  contactExtension: '担当者内線',
  applicantNationality: '申請人国籍',
  applicantOccupation: '申請人職業',
  applicantPassportName: '申請人氏名（旅券表記）',
  applicantGenderMale: '申請人性別（男）',
  applicantGenderFemale: '申請人性別（女）',
  applicantGenderOtherText: 'ほか',
  applicantDateOfBirthYear: '申請人生年',
  applicantDateOfBirthMonth: '申請人生月',
  applicantDateOfBirthDay: '申請人生日',
  applicantAge: '申請人年齢',
  invitationPurpose: '招へい目的',
  invitationBackground: '招へい経緯',
  relationshipToApplicant: '申請人との関係',
};

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toReiwa(date: Date) {
  const reiwaStart = Date.UTC(2019, 4, 1);
  if (date.getTime() < reiwaStart) throw new Error('令和より前の日付はこのサンプルでは対応していません。');
  return { era: '令和', year: date.getUTCFullYear() - 2018 };
}

function calculateAge(onDate: Date, birthDate: Date) {
  let age = onDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayThisYear = Date.UTC(onDate.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate());
  if (onDate.getTime() < birthdayThisYear) age -= 1;
  return age;
}

function getFieldName(key: InvitationReasonPdfFieldKey) {
  const name = invitationReasonPdfFields[key];
  if (!name) throw new Error(`PDFフィールド名が未設定です: ${requiredFieldLabels[key]}。src/lib/pdfFieldNames.ts に実際のフィールド名を設定してください。`);
  return name;
}

function setText(form: PDFForm, key: InvitationReasonPdfFieldKey, value: string, font: PDFFont) {
  const name = getFieldName(key);
  const field = form.getField(name);
  if (!(field instanceof PDFTextField)) throw new Error(`PDFフィールド「${name}」はテキストフィールドではありません。`);
  field.setText(value);
  field.updateAppearances(font);
}

function setCheckbox(form: PDFForm, key: InvitationReasonPdfFieldKey, checked: boolean) {
  const name = getFieldName(key);
  const field = form.getField(name);
  if (!(field instanceof PDFCheckBox)) throw new Error(`PDFフィールド「${name}」はチェックボックスではありません。`);
  if (checked) field.check(); else field.uncheck();
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
}

export default function Home() {
  const [message, setMessage] = useState('下のボタンから固定サンプルデータの招へい理由書PDFを作成できます。');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generatePdf() {
    setIsLoading(true);
    setError(null);
    setMessage('PDFを作成しています...');

    try {
      const [templateResponse, fontResponse] = await Promise.all([fetch(templatePath), fetch(fontPath)]);
      if (!templateResponse.ok) throw new Error(`PDFテンプレートを読み込めませんでした: ${templatePath}`);
      if (!fontResponse.ok) throw new Error('日本語表示用フォント public/fonts/NotoSansJP-Regular.ttf が見つかりません。READMEの手順に従って配置してください。');

      const pdfDoc = await PDFDocument.load(await templateResponse.arrayBuffer());
      pdfDoc.registerFontkit(fontkit);
      const japaneseFont = await pdfDoc.embedFont(await fontResponse.arrayBuffer(), { subset: true });
      const form = pdfDoc.getForm();
      const documentDate = parseDate(sampleData.documentDate);
      const birthDate = parseDate(sampleData.dateOfBirth);
      const reiwa = toReiwa(documentDate);
      const [postalFirst3, postalLast4] = sampleData.postalCode.split('-');

      setText(form, 'documentDateEra', reiwa.era, japaneseFont);
      setText(form, 'documentDateYear', String(reiwa.year), japaneseFont);
      setText(form, 'documentDateMonth', String(documentDate.getUTCMonth() + 1), japaneseFont);
      setText(form, 'documentDateDay', String(documentDate.getUTCDate()), japaneseFont);
      setText(form, 'diplomaticMission', sampleData.diplomaticMission, japaneseFont);
      setText(form, 'inviterPostalCodeFirst3', postalFirst3, japaneseFont);
      setText(form, 'inviterPostalCodeLast4', postalLast4, japaneseFont);
      setText(form, 'inviterAddress', sampleData.address, japaneseFont);
      setText(form, 'inviterName', sampleData.inviterName, japaneseFont);
      setText(form, 'inviterPhone', sampleData.inviterPhone, japaneseFont);
      setText(form, 'inviterExtension', sampleData.inviterExtension, japaneseFont);
      setText(form, 'organisationName', sampleData.organisationName, japaneseFont);
      setText(form, 'contactPersonName', sampleData.contactPersonName, japaneseFont);
      setText(form, 'contactPhone', sampleData.contactPhone, japaneseFont);
      setText(form, 'contactExtension', sampleData.contactExtension, japaneseFont);
      setText(form, 'applicantNationality', sampleData.nationality, japaneseFont);
      setText(form, 'applicantOccupation', sampleData.occupation, japaneseFont);
      setText(form, 'applicantPassportName', sampleData.passportName, japaneseFont);
      setCheckbox(form, 'applicantGenderMale', sampleData.gender === 'male');
      setCheckbox(form, 'applicantGenderFemale', sampleData.gender === 'female');
      setText(form, 'applicantGenderOtherText', '', japaneseFont);
      setText(form, 'applicantDateOfBirthYear', String(birthDate.getUTCFullYear()), japaneseFont);
      setText(form, 'applicantDateOfBirthMonth', String(birthDate.getUTCMonth() + 1), japaneseFont);
      setText(form, 'applicantDateOfBirthDay', String(birthDate.getUTCDate()), japaneseFont);
      setText(form, 'applicantAge', String(calculateAge(documentDate, birthDate)), japaneseFont);
      setText(form, 'invitationPurpose', sampleData.invitationPurpose, japaneseFont);
      setText(form, 'invitationBackground', sampleData.invitationBackground, japaneseFont);
      setText(form, 'relationshipToApplicant', sampleData.relationshipToApplicant, japaneseFont);

      form.flatten();
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `InvitationReason_${safeFileName(sampleData.programName)}_${safeFileName(sampleData.passportName)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage('招へい理由書PDFを作成しました。ダウンロードをご確認ください。');
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : '不明なエラーが発生しました。';
      console.error(caughtError);
      setError(errorMessage);
      setMessage('PDF作成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">招へい理由書 作成ツール</p>
        <h1>固定サンプルデータから招へい理由書PDFを作成</h1>
        <p>申請人1名分のサンプルデータを使用し、PDFテンプレートへ入力してフラット化したPDFをダウンロードします。</p>
        <button type="button" onClick={generatePdf} disabled={isLoading}>{isLoading ? '作成中...' : '完成PDFをダウンロード'}</button>
      </section>

      <section className="result" aria-live="polite">
        <h2>処理結果</h2>
        <p>{message}</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
