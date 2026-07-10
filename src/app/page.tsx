'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { validateBatch, type BatchValidationResult } from '../domain/batchValidation';
import { fixedInvitationReasonSample, invitationReasonDownloadBaseName } from '../domain/invitationReasonData';
import { canvasToPngBlob, InvitationRenderError } from '../pdf/canvasText';
import { exportInvitationPdf } from '../pdf/exportInvitationPdf';
import { renderInvitationCanvas } from '../pdf/renderInvitationCanvas';

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
  batch: BatchValidationResult;
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
      <PreviewGroup title="Common information summary" rows={[
        { label: '担当者氏名', value: data.organisation.contactPersonName },
        { label: '招へい経緯', value: data.invitation.background },
        { label: '申請人との関係', value: data.invitation.relationship },
      ]} />
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
      <section className="applicantReview">
        <h3>Applicant review</h3>
        <p>有効な申請人: {result.batch.validApplicantCount} / {result.batch.reviewApplicants.length}</p>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>sequence</th>
                <th>Excel source row</th>
                <th>passport name</th>
                <th>nationality</th>
                <th>occupation</th>
                <th>gender</th>
                <th>date of birth</th>
                <th>calculated age</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              {result.batch.reviewApplicants.map((applicant) => (
                <tr key={`${applicant.sourceRow}-${applicant.sequence}`} className={applicant.status === 'error' ? 'rowError' : undefined}>
                  <td>{applicant.sequence}</td>
                  <td>{applicant.sourceRow}</td>
                  <td>{applicant.passportName || '（未入力）'}</td>
                  <td>{applicant.nationality || '（未入力）'}</td>
                  <td>{applicant.occupation || '（未入力）'}</td>
                  <td>{applicant.gender || '（未入力）'}</td>
                  <td>{applicant.dateOfBirth || '（未入力）'}</td>
                  <td>{applicant.age ?? '（計算不可）'}</td>
                  <td>{applicant.status === 'valid' ? 'valid' : applicant.errors.join(' / ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="validationBlock errors"><h3>Validation errors</h3>{result.errors.length ? <ul>{result.errors.map((item) => <li key={item}>{item}</li>)}</ul> : <p>エラーはありません。</p>}</div>
      <div className="validationBlock warnings"><h3>Validation warnings</h3>{result.warnings.length ? <ul>{result.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p>警告はありません。</p>}</div>
    </section>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toJapaneseRenderError(error: unknown) {
  if (error instanceof InvitationRenderError) return error.message;
  if (error instanceof Error) return error.message;
  return 'レンダリング中に不明なエラーが発生しました。';
}

export default function Home() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderMessage, setRenderMessage] = useState('Canvasプレビューを生成できます。ExcelデータはこのPDF出力にはまだ接続していません。');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelParseResult | null>(null);

  useEffect(() => {
    setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
  }, []);

  async function regeneratePreview(debugOverride = isDebug) {
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('Canvasプレビューを作成しています...');
    try {
      if (!previewCanvasRef.current) throw new InvitationRenderError('CANVAS_CONTEXT', 'Canvasを初期化できませんでした。');
      await renderInvitationCanvas(fixedInvitationReasonSample, { canvas: previewCanvasRef.current, debug: debugOverride });
      setRenderMessage(debugOverride ? 'デバッグ枠付きCanvasプレビューを作成しました。ダウンロードにはデバッグ枠は入りません。' : 'Canvasプレビューを作成しました。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('Canvasプレビューの作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  useEffect(() => { void regeneratePreview(isDebug); }, [isDebug]);

  async function downloadCompletedPng() {
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('PNGを作成しています...');
    try {
      const canvas = await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false });
      const blob = await canvasToPngBlob(canvas);
      downloadBlob(blob, `${invitationReasonDownloadBaseName}.png`);
      setRenderMessage('完成PNGを作成しました。ダウンロードをご確認ください。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('PNG作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadCompletedPdf() {
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('PDFを作成しています...');
    try {
      const canvas = await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false });
      const blob = await exportInvitationPdf(canvas);
      downloadBlob(blob, `${invitationReasonDownloadBaseName}.pdf`);
      setRenderMessage('完成PDFを作成しました。ダウンロードをご確認ください。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('PDF作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadExcelTemplate() {
    const XLSX = await loadXlsx();
    const worksheet = XLSX.utils.json_to_sheet(excelTemplateRows, { header: ['section', 'field', 'value', 'note'] });
    worksheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 48 }, { wch: 52 }];
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    for (let index = 1; index <= excelTemplateRows.length; index += 1) {
      const fieldCell = worksheet[`B${index + 1}`]?.v;
      if (fieldCell === 'documentDate' || fieldCell === 'dateOfBirth') {
        const cell = worksheet[`C${index + 1}`];
        if (cell) { cell.t = 's'; cell.z = '@'; }
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
          if (!excelFieldSet.has(key)) { warnings.push(`未定義の項目です（${index + 2}行目）: ${section || 'section空欄'} / ${field || 'field空欄'}`); return; }
          const value = dateFieldSet.has(key) ? normalizeExcelDate(rawValue, XLSX) : stringifyExcelValue(rawValue);
          if (dateFieldSet.has(key) && value === null) { errors.push(`${section} / ${field} は YYYY-MM-DD に変換できません。入力値を確認してください。`); return; }
          assignExcelValue(data, section, field, value ?? '');
        });
      }
      validateExcelData(data, errors);
    } catch (caughtError) { errors.push(caughtError instanceof Error ? caughtError.message : 'Excelファイルの読み込みに失敗しました。'); }
    const batch = validateBatch([{ sourceRow: 14, ...data.applicant }]);
    setExcelResult({ fileName: file.name, data, errors, warnings, batch });
    event.target.value = '';
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">招へい理由書 作成ツール</p>
        <h1>固定サンプルデータから招へい理由書PDFを作成</h1>
        <p>ブラウザCanvas上で背景PNGと固定サンプル文字を合成し、その完成PNGだけを新規A4 PDFへ貼り込みます。</p>
      </section>

      <section className="rendererSection">
        <p className="eyebrow">Fixed sample renderer</p>
        <h2>Canvas PDF Renderer - Proof of Concept</h2>
        <p>この検証版ではExcelデータをPDF生成へ接続せず、固定サンプル1名分だけを描画します。{isDebug ? ' debug=1 のためプレビューに赤い配置枠を表示しています。' : ''}</p>
        <div className="buttonRow">
          <button type="button" onClick={() => regeneratePreview(isDebug)} disabled={isRendering}>{isRendering ? '処理中...' : 'プレビューを再生成'}</button>
          <button type="button" onClick={downloadCompletedPng} disabled={isRendering}>完成PNGをダウンロード</button>
          <button type="button" onClick={downloadCompletedPdf} disabled={isRendering}>完成PDFをダウンロード</button>
        </div>
        <div className="canvasFrame"><canvas ref={previewCanvasRef} width={2481} height={3508} aria-label="招へい理由書Canvasプレビュー" /></div>
        <div className="result" aria-live="polite"><h3>レンダリング状況</h3><p>{renderMessage}</p>{renderError ? <p className="error">{renderError}</p> : null}</div>
      </section>

      <section className="excelSection">
        <p className="eyebrow">Excel入力（Step 3A）</p>
        <h2>Excelテンプレートのダウンロード・アップロード</h2>
        <p>Excelで入力した内容を画面上で確認します。この段階ではアップロード内容をPDF生成には接続しません。</p>
        <div className="buttonRow">
          <button type="button" onClick={downloadExcelTemplate}>Excelテンプレートをダウンロード</button>
          <label className="uploadButton">Excelファイルをアップロード<input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} /></label>
        </div>
        {excelResult ? <ExcelPreview result={excelResult} /> : null}
      </section>
    </main>
  );
}
