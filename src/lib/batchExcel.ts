import type { ApplicantDraft, CommonInfo, ValidationIssue } from '../domain/batchApplicant';
import { commonInfoFields, getCommonFieldLabel, normalizeDateInput, optionalCommonKeys, validateBatch, type BatchParseResult } from '../domain/batchApplicant';

type XlsxModule = typeof import('xlsx/xlsx.mjs');

export const batchTemplateFilename = 'shouhei_riyusho_multi_applicant_template.xlsx';
export const commonSheetName = '共通情報';
export const applicantsSheetName = '申請人一覧';

const initialValues: Record<keyof CommonInfo, string> = {
  programName: 'Ritsumeikan Short-term Study Program', documentDate: '2026-07-08', diplomaticMission: '上海', inviterPostalCode: '603-8577', inviterAddress: '京都市北区等持院北町56-1', inviterName: '田中 猛', inviterPhone: '075-466-3009', inviterExtension: '511-4794', organisationName: 'Ritsumeikan Study Abroad Center', contactPersonName: 'Takeshi Tanaka', contactPhone: '075-466-3009', contactExtension: '511-4794', invitationPurpose: '短期留学生受入プログラムに参加するため', invitationBackground: '協定校から推薦された学生を受け入れるため', relationshipToApplicant: '受入機関',
};

function stringValue(value: unknown) { return String(value ?? '').trim(); }

export function createBatchWorkbook(XLSX: XlsxModule) {
  const commonRows = [['key', '項目', '値', '入力説明'], ...commonInfoFields.map((key) => [key, getCommonFieldLabel(key), initialValues[key], `key列はシステム用です。変更しないでください。${optionalCommonKeys.has(key) ? 'この項目は任意です。' : '必須項目です。'}`])];
  const commonSheet = XLSX.utils.aoa_to_sheet(commonRows);
  commonSheet['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 52 }, { wch: 62 }];
  commonSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  commonSheet['!autofilter'] = { ref: `A1:D${commonRows.length}` };

  const applicantRows = [['No.', '国籍', '職業', 'パスポート表記氏名', '性別', '生年月日'], ...Array.from({ length: 20 }, (_, index) => [index + 1, '', '', '', '', ''])];
  const applicantSheet = XLSX.utils.aoa_to_sheet(applicantRows);
  applicantSheet['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 32 }, { wch: 12 }, { wch: 16 }];
  applicantSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  applicantSheet['!autofilter'] = { ref: 'A1:F21' };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, commonSheet, commonSheetName);
  XLSX.utils.book_append_sheet(workbook, applicantSheet, applicantsSheetName);
  workbook.Workbook = { ...(workbook.Workbook ?? {}), Views: [{ activeTab: 0 }] };
  return workbook;
}

export function parseBatchWorkbook(XLSX: XlsxModule, workbook: import('xlsx').WorkBook, fileName: string): BatchParseResult {
  const issues: ValidationIssue[] = [];
  const common: Partial<CommonInfo> & Record<string, string> = {};
  const keyRows = new Map<string, number>();
  const commonSheet = workbook.Sheets[commonSheetName];
  if (!commonSheet) issues.push({ level: 'error', scope: 'common', field: 'sheet', message: `「${commonSheetName}」シートが見つかりません。` });
  else {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(commonSheet, { defval: '', raw: true });
    rows.forEach((row, index) => {
      const sourceRow = index + 2;
      const key = stringValue(row.key);
      if (!key && !stringValue(row['項目']) && !stringValue(row['値']) && !stringValue(row['入力説明'])) return;
      if (!key) { issues.push({ level: 'error', scope: 'common', sourceRow, field: 'key', message: 'keyが空欄です。' }); return; }
      if (keyRows.has(key)) issues.push({ level: 'error', scope: 'common', sourceRow, field: key, message: `keyが重複しています: ${key}` });
      keyRows.set(key, sourceRow);
      if (key === 'additionalApplicantsCount') issues.push({ level: 'error', scope: 'common', sourceRow, field: key, message: 'additionalApplicantsCount はExcelに追加しないでください。' });
      else if (!commonInfoFields.includes(key as keyof CommonInfo)) issues.push({ level: 'warning', scope: 'common', sourceRow, field: key, message: `不明なkeyです: ${key}` });
      const raw = row['値'];
      const value = key === 'documentDate' ? normalizeDateInput(raw, XLSX.SSF.parse_date_code) : stringValue(raw);
      common[key] = value ?? stringValue(raw);
    });
  }

  const applicantSheet = workbook.Sheets[applicantsSheetName];
  const drafts: ApplicantDraft[] = [];
  if (!applicantSheet) issues.push({ level: 'error', scope: 'applicant', field: 'sheet', message: `「${applicantsSheetName}」シートが見つかりません。` });
  else {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(applicantSheet, { defval: '', raw: true });
    rows.forEach((row, index) => {
      const sourceRow = index + 2;
      const values = ['国籍', '職業', 'パスポート表記氏名', '性別'].map((field) => stringValue(row[field]));
      const rawDateOfBirth = row['生年月日'];
      const dateOfBirth = normalizeDateInput(rawDateOfBirth, XLSX.SSF.parse_date_code) ?? stringValue(rawDateOfBirth);
      if ([...values, stringValue(rawDateOfBirth)].every((value) => !value)) return;
      drafts.push({ sourceRow, nationality: values[0], occupation: values[1], passportName: values[2], gender: values[3], dateOfBirth });
    });
  }
  return { fileName, ...validateBatch(common, drafts, issues) };
}
