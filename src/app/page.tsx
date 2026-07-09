'use client';

import { useState, type ChangeEvent } from 'react';
import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFFont } from 'pdf-lib';
import { invitationReasonPdfFields, type InvitationReasonPdfFieldKey } from '../lib/pdfFieldNames';

const templatePath = '/templates/shouhei-riyusho.pdf';
const fontPath = '/fonts/NotoSansJP-Regular.ttf';

type ProgramInfo = {
  programName: string;
  documentDate: string;
  diplomaticMission: string;
};

type InviterInfo = {
  postalCode: string;
  address: string;
  name: string;
  phone: string;
  extension: string;
};

type OrganisationContact = {
  organisationName: string;
  contactPersonName: string;
  phone: string;
  extension: string;
};

type Applicant = {
  passportName: string;
  nationality: string;
  occupation: string;
  gender: string;
  dateOfBirth: string;
};

type InvitationInfo = {
  purpose: string;
  background: string;
  relationship: string;
};

type ParsedExcelData = {
  program: ProgramInfo;
  inviter: InviterInfo;
  organisation: OrganisationContact;
  applicant: Applicant;
  invitation: InvitationInfo;
};

type ExcelParseResult = {
  fileName: string;
  data: ParsedExcelData;
  errors: string[];
  warnings: string[];
};

type TemplateRow = {
  section: string;
  field: string;
  value: string;
  note: string;
};

type XlsxModule = typeof import('xlsx/xlsx.mjs');

const emptyParsedExcelData: ParsedExcelData = {
  program: { programName: '', documentDate: '', diplomaticMission: '' },
  inviter: { postalCode: '', address: '', name: '', phone: '', extension: '' },
  organisation: { organisationName: '', contactPersonName: '', phone: '', extension: '' },
  applicant: { passportName: '', nationality: '', occupation: '', gender: '', dateOfBirth: '' },
  invitation: { purpose: '', background: '', relationship: '' },
};

const excelTemplateRows: TemplateRow[] = [
  { section: 'Program', field: 'programName', value: 'Ritsumeikan Short-term Study Program', note: '管理用。PDFには表示しない' },
  { section: 'Program', field: 'documentDate', value: '2026-07-08', note: 'YYYY-MM-DD。文字列として扱う' },
  { section: 'Program', field: 'diplomaticMission', value: '上海', note: 'PDFの「在」と「日本国」の間に入る文字。例：上海' },
  { section: 'Inviter', field: 'postalCode', value: '603-8577', note: 'ハイフンあり' },
  { section: 'Inviter', field: 'address', value: '京都市北区等持院北町56-1', note: '招へい人住所' },
  { section: 'Inviter', field: 'name', value: '田中 猛', note: '招へい人氏名' },
  { section: 'Inviter', field: 'phone', value: '075-466-3009', note: '招へい人電話番号' },
  { section: 'Inviter', field: 'extension', value: '511-4794', note: '内線' },
  { section: 'Organisation', field: 'organisationName', value: 'Ritsumeikan Study Abroad Center', note: '担当者所属先名' },
  { section: 'Organisation', field: 'contactPersonName', value: 'Takeshi Tanaka', note: '担当者氏名' },
  { section: 'Organisation', field: 'phone', value: '075-466-3009', note: '担当者電話番号' },
  { section: 'Organisation', field: 'extension', value: '511-4794', note: '内線' },
  { section: 'Applicant', field: 'passportName', value: 'ZHANG WEI', note: '旅券上のアルファベット表記' },
  { section: 'Applicant', field: 'nationality', value: 'China', note: '国籍' },
  { section: 'Applicant', field: 'occupation', value: 'Student', note: '職業' },
  { section: 'Applicant', field: 'gender', value: 'male', note: 'male または female' },
  { section: 'Applicant', field: 'dateOfBirth', value: '2004-05-12', note: 'YYYY-MM-DD。文字列として扱う' },
  { section: 'Invitation', field: 'purpose', value: '短期留学生受入プログラムに参加するため', note: '招へい目的' },
  { section: 'Invitation', field: 'background', value: '協定校から推薦された学生を受け入れるため', note: '招へい経緯' },
  { section: 'Invitation', field: 'relationship', value: '受入機関', note: '申請人との関係' },
];

const excelFieldSet = new Set(excelTemplateRows.map((row) => `${row.section}|${row.field}`));
const dateFieldSet = new Set(['Program|documentDate', 'Applicant|dateOfBirth']);
const optionalExcelFields = new Set(['Inviter|extension', 'Organisation|extension']);
const requiredExcelFields = excelTemplateRows.filter((row) => !optionalExcelFields.has(`${row.section}|${row.field}`));

function cloneEmptyParsedExcelData(): ParsedExcelData {
  return JSON.parse(JSON.stringify(emptyParsedExcelData)) as ParsedExcelData;
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function normalizeExcelDate(value: unknown, xlsx?: XlsxModule): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return formatDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = xlsx?.SSF.parse_date_code(value);
    if (!parsed) return null;
    return formatDateParts(parsed.y, parsed.m, parsed.d);
  }
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split('/').map(Number);
    return formatDateParts(year, month, day);
  }
  return null;
}

async function loadXlsx() {
  return import('xlsx/xlsx.mjs');
}

function stringifyExcelValue(value: unknown) {
  if (value instanceof Date) return normalizeExcelDate(value) ?? '';
  return String(value ?? '').trim();
}

function assignExcelValue(data: ParsedExcelData, section: string, field: string, value: string) {
  if (section === 'Program' && field in data.program) data.program[field as keyof ProgramInfo] = value;
  if (section === 'Inviter' && field in data.inviter) data.inviter[field as keyof InviterInfo] = value;
  if (section === 'Organisation' && field in data.organisation) data.organisation[field as keyof OrganisationContact] = value;
  if (section === 'Applicant' && field in data.applicant) data.applicant[field as keyof Applicant] = value;
  if (section === 'Invitation' && field in data.invitation) data.invitation[field as keyof InvitationInfo] = value;
}

function getExcelValue(data: ParsedExcelData, section: string, field: string) {
  if (section === 'Program') return data.program[field as keyof ProgramInfo];
  if (section === 'Inviter') return data.inviter[field as keyof InviterInfo];
  if (section === 'Organisation') return data.organisation[field as keyof OrganisationContact];
  if (section === 'Applicant') return data.applicant[field as keyof Applicant];
  if (section === 'Invitation') return data.invitation[field as keyof InvitationInfo];
  return '';
}

function validateExcelData(data: ParsedExcelData, errors: string[]) {
  for (const row of requiredExcelFields) {
    if (!getExcelValue(data, row.section, row.field)) errors.push(`必須項目が未入力です: ${row.section} / ${row.field}`);
  }
  if (data.program.documentDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.program.documentDate)) errors.push('documentDate は YYYY-MM-DD 形式で入力してください。');
  if (data.applicant.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(data.applicant.dateOfBirth)) errors.push('dateOfBirth は YYYY-MM-DD 形式で入力してください。');
  if (data.applicant.gender && !['male', 'female'].includes(data.applicant.gender)) errors.push('gender は male または female を入力してください。');
  if (data.applicant.passportName && !/^[A-Za-z '\-]+$/.test(data.applicant.passportName)) errors.push('passportName は英字、スペース、ハイフン、アポストロフィのみで入力してください。');
  if (data.inviter.postalCode && !/^\d{3}-\d{4}$/.test(data.inviter.postalCode)) errors.push('postalCode は 3桁-4桁（例: 603-8577）で入力してください。');
}

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

const requiredFieldLabels: Record<InvitationReasonPdfFieldKey, string> = {
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
  additionalApplicantsCount: 'ほか N 名（追加申請人数）',
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

function toReiwaYear(date: Date) {
  const reiwaStart = Date.UTC(2019, 4, 1);
  if (date.getTime() < reiwaStart) throw new Error('令和より前の日付はこのサンプルでは対応していません。');
  return date.getUTCFullYear() - 2018;
}

function calculateAge(onDate: Date, birthDate: Date) {
  let age = onDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayThisYear = Date.UTC(onDate.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate());
  if (onDate.getTime() < birthdayThisYear) age -= 1;
  return age;
}

function getFieldName(key: InvitationReasonPdfFieldKey) {
  const name = invitationReasonPdfFields[key];
  if (!name) throw new Error(`PDFフィールド名が未設定です: ${requiredFieldLabels[key]}。docs/pdf-field-inspection.md で座標を確認し、src/lib/pdfFieldNames.ts に実際のフィールド名を設定してください。`);
  return name;
}

function getMappingStatus(key: InvitationReasonPdfFieldKey) {
  return invitationReasonPdfFields[key] ? 'mapped' : 'unmapped';
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

const documentDate = parseDate(sampleData.documentDate);
const birthDate = parseDate(sampleData.dateOfBirth);
const [postalFirst3, postalLast4] = sampleData.postalCode.split('-');
const sampleValues: Record<InvitationReasonPdfFieldKey, string> = {
  documentDateYear: String(toReiwaYear(documentDate)),
  documentDateMonth: String(documentDate.getUTCMonth() + 1),
  documentDateDay: String(documentDate.getUTCDate()),
  diplomaticMission: sampleData.diplomaticMission,
  inviterPostalCodeFirst3: postalFirst3,
  inviterPostalCodeLast4: postalLast4,
  inviterAddress: sampleData.address,
  inviterName: sampleData.inviterName,
  inviterPhone: sampleData.inviterPhone,
  inviterExtension: sampleData.inviterExtension,
  organisationName: sampleData.organisationName,
  contactPersonName: sampleData.contactPersonName,
  contactPhone: sampleData.contactPhone,
  contactExtension: sampleData.contactExtension,
  applicantNationality: sampleData.nationality,
  applicantOccupation: sampleData.occupation,
  applicantPassportName: sampleData.passportName,
  applicantGenderMale: sampleData.gender === 'male' ? 'checked' : 'unchecked',
  applicantGenderFemale: sampleData.gender === 'female' ? 'checked' : 'unchecked',
  additionalApplicantsCount: '',
  applicantDateOfBirthYear: String(birthDate.getUTCFullYear()),
  applicantDateOfBirthMonth: String(birthDate.getUTCMonth() + 1),
  applicantDateOfBirthDay: String(birthDate.getUTCDate()),
  applicantAge: String(calculateAge(documentDate, birthDate)),
  invitationPurpose: sampleData.invitationPurpose,
  invitationBackground: sampleData.invitationBackground,
  relationshipToApplicant: sampleData.relationshipToApplicant,
};

const mappingRows = (Object.keys(requiredFieldLabels) as InvitationReasonPdfFieldKey[]).map((key) => ({
  key,
  label: requiredFieldLabels[key],
  fieldName: invitationReasonPdfFields[key],
  sampleValue: sampleValues[key],
  status: getMappingStatus(key),
}));


function PreviewGroup({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <section className="previewGroup">
      <h3>{title}</h3>
      <dl>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value || '（未入力）'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ExcelPreview({ result }: { result: ExcelParseResult }) {
  const { data } = result;
  return (
    <section className="excelPreview">
      <h3>Excel取込プレビュー</h3>
      <p className="fileName">ファイル名: {result.fileName}</p>
      <PreviewGroup title="Program information" rows={[
        { label: 'プログラム名', value: data.program.programName },
        { label: '作成日', value: data.program.documentDate },
        { label: '宛先公館', value: data.program.diplomaticMission },
      ]} />
      <PreviewGroup title="Inviter information" rows={[
        { label: '郵便番号', value: data.inviter.postalCode },
        { label: '住所', value: data.inviter.address },
        { label: '氏名', value: data.inviter.name },
        { label: '電話番号', value: data.inviter.phone },
        { label: '内線', value: data.inviter.extension },
      ]} />
      <PreviewGroup title="Organisation contact information" rows={[
        { label: '所属機関名', value: data.organisation.organisationName },
        { label: '担当者氏名', value: data.organisation.contactPersonName },
        { label: '電話番号', value: data.organisation.phone },
        { label: '内線', value: data.organisation.extension },
      ]} />
      <PreviewGroup title="Applicant information" rows={[
        { label: '旅券氏名', value: data.applicant.passportName },
        { label: '国籍', value: data.applicant.nationality },
        { label: '職業', value: data.applicant.occupation },
        { label: '性別', value: data.applicant.gender },
        { label: '生年月日', value: data.applicant.dateOfBirth },
      ]} />
      <PreviewGroup title="Invitation information" rows={[
        { label: '招へい目的', value: data.invitation.purpose },
        { label: '招へい経緯', value: data.invitation.background },
        { label: '申請人との関係', value: data.invitation.relationship },
      ]} />
      <div className="validationBlock errors"><h3>Validation errors</h3>{result.errors.length ? <ul>{result.errors.map((item) => <li key={item}>{item}</li>)}</ul> : <p>エラーはありません。</p>}</div>
      <div className="validationBlock warnings"><h3>Validation warnings</h3>{result.warnings.length ? <ul>{result.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p>警告はありません。</p>}</div>
    </section>
  );
}

export default function Home() {
  const [message, setMessage] = useState('下のボタンから固定サンプルデータの招へい理由書PDFを作成できます。');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [excelResult, setExcelResult] = useState<ExcelParseResult | null>(null);

  async function downloadExcelTemplate() {
    const XLSX = await loadXlsx();
    const worksheet = XLSX.utils.json_to_sheet(excelTemplateRows, { header: ['section', 'field', 'value', 'note'] });
    worksheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 48 }, { wch: 52 }];
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    for (let index = 1; index <= excelTemplateRows.length; index += 1) {
      const fieldCell = worksheet[`B${index + 1}`]?.v;
      if (fieldCell === 'documentDate' || fieldCell === 'dateOfBirth') {
        const cell = worksheet[`C${index + 1}`];
        if (cell) {
          cell.t = 's';
          cell.z = '@';
        }
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Input');
    XLSX.writeFile(workbook, 'shouhei_riyusho_template.xlsx');
  }

  async function handleExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const errors: string[] = [];
    const warnings: string[] = [];
    const data = cloneEmptyParsedExcelData();
    try {
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets.Input;
      if (!worksheet) errors.push('Input シートが見つかりません。');
      else {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', raw: true });
        rows.forEach((row, index) => {
          const section = stringifyExcelValue(row.section);
          const field = stringifyExcelValue(row.field);
          const rawValue = row.value;
          const note = stringifyExcelValue(row.note);
          if (!section && !field && !stringifyExcelValue(rawValue) && !note) return;
          const key = `${section}|${field}`;
          if (!excelFieldSet.has(key)) {
            warnings.push(`未定義の項目です（${index + 2}行目）: ${section || 'section空欄'} / ${field || 'field空欄'}`);
            return;
          }
          const value = dateFieldSet.has(key) ? normalizeExcelDate(rawValue, XLSX) : stringifyExcelValue(rawValue);
          if (dateFieldSet.has(key) && value === null) {
            errors.push(`${section} / ${field} は YYYY-MM-DD に変換できません。入力値を確認してください。`);
            return;
          }
          assignExcelValue(data, section, field, value ?? '');
        });
      }
      validateExcelData(data, errors);
    } catch (caughtError) {
      errors.push(caughtError instanceof Error ? caughtError.message : 'Excelファイルの読み込みに失敗しました。');
    }
    setExcelResult({ fileName: file.name, data, errors, warnings });
    event.target.value = '';
  }

  async function generatePdf() {
    setIsLoading(true);
    setError(null);
    setMessage('PDFを作成しています...');

    try {
      const unmappedRows = mappingRows.filter((row) => row.status !== 'mapped');
      if (unmappedRows.length > 0) {
        throw new Error(`PDFフィールド未設定: ${unmappedRows.map((row) => row.label).join('、')}。docs/pdf-field-inspection.md の座標で確認してから設定してください。`);
      }

      const [templateResponse, fontResponse] = await Promise.all([fetch(templatePath), fetch(fontPath)]);
      if (!templateResponse.ok) throw new Error(`PDFテンプレートを読み込めませんでした: ${templatePath}`);
      if (!fontResponse.ok) throw new Error('日本語表示用フォント public/fonts/NotoSansJP-Regular.ttf が見つかりません。READMEの手順に従って配置してください。');

      const pdfDoc = await PDFDocument.load(await templateResponse.arrayBuffer());
      const fontkit = await import('@pdf-lib/' + 'fontkit').then((module) => module.default);
      pdfDoc.registerFontkit(fontkit);
      const japaneseFont = await pdfDoc.embedFont(await fontResponse.arrayBuffer(), { subset: true });
      const form = pdfDoc.getForm();
      const reiwaYear = toReiwaYear(documentDate);

      setText(form, 'documentDateYear', String(reiwaYear), japaneseFont);
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
      setText(form, 'additionalApplicantsCount', '', japaneseFont);
      setText(form, 'applicantDateOfBirthYear', String(birthDate.getUTCFullYear()), japaneseFont);
      setText(form, 'applicantDateOfBirthMonth', String(birthDate.getUTCMonth() + 1), japaneseFont);
      setText(form, 'applicantDateOfBirthDay', String(birthDate.getUTCDate()), japaneseFont);
      setText(form, 'applicantAge', String(calculateAge(documentDate, birthDate)), japaneseFont);
      setText(form, 'invitationPurpose', sampleData.invitationPurpose, japaneseFont);
      setText(form, 'invitationBackground', sampleData.invitationBackground, japaneseFont);
      setText(form, 'relationshipToApplicant', sampleData.relationshipToApplicant, japaneseFont);

      form.flatten();
      const bytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
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


      <section className="excelSection">
        <p className="eyebrow">Excel入力（Step 3A）</p>
        <h2>Excelテンプレートのダウンロード・アップロード</h2>
        <p>Excelで入力した内容を画面上で確認します。この段階ではアップロード内容をPDF生成には接続しません。</p>
        <div className="buttonRow">
          <button type="button" onClick={downloadExcelTemplate}>Excelテンプレートをダウンロード</button>
          <label className="uploadButton">
            Excelファイルをアップロード
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
          </label>
        </div>
        {excelResult ? <ExcelPreview result={excelResult} /> : null}
      </section>

      <section className="debug">
        <h2>PDFフィールド対応表（デバッグ）</h2>
        <p>AcroFormの順番だけで判断せず、<code>docs/pdf-field-inspection.md</code> の座標で確認した対応だけを mapped にします。</p>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>semantic key</th>
                <th>日本語ラベル</th>
                <th>PDF field</th>
                <th>sample value</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {mappingRows.map((row) => (
                <tr key={row.key}>
                  <td><code>{row.key}</code></td>
                  <td>{row.label}</td>
                  <td>{row.fieldName || '未設定'}</td>
                  <td>{row.sampleValue || '（空欄）'}</td>
                  <td className={row.status === 'mapped' ? 'mapped' : 'unmapped'}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="result" aria-live="polite">
        <h2>処理結果</h2>
        <p>{message}</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
