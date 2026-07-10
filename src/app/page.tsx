'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { BatchApplicant, BatchParseResult, CommonInfo, ValidationIssue } from '../domain/batchApplicant';
import { requiredCommonKeys } from '../domain/batchApplicant';
import { createInvitationReasonPdfFilename, toInvitationReasonData } from '../domain/batchInvitationMapping';
import { fixedInvitationReasonSample, invitationReasonDownloadBaseName, type InvitationReasonData } from '../domain/invitationReasonData';
import { batchTemplateFilename, createBatchWorkbook, parseBatchWorkbook } from '../lib/batchExcel';
import { createZipBlob } from '../lib/zip';
import { canvasToPngBlob, InvitationRenderError } from '../pdf/canvasText';
import { drawDocumentNumber } from '../pdf/drawDocumentNumber';
import { exportInvitationPdf } from '../pdf/exportInvitationPdf';
import { renderInvitationCanvas } from '../pdf/renderInvitationCanvas';

type XlsxModule = typeof import('xlsx/xlsx.mjs');

async function loadXlsx(): Promise<XlsxModule> { return import('xlsx/xlsx.mjs'); }

function PreviewGroup({ title, rows }: { title: string; rows: { label: string; value: string | number | undefined }[] }) {
  return <section className="previewGroup"><h3>{title}</h3><dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value || '（未入力）'}</dd></div>)}</dl></section>;
}

function IssueList({ title, issues, className }: { title: string; issues: ValidationIssue[]; className: string }) {
  return <div className={`validationBlock ${className}`}><h3>{title}</h3>{issues.length ? <ul>{issues.map((issue, index) => <li key={`${issue.level}-${issue.scope}-${issue.sourceRow}-${issue.field}-${index}`}>{issue.sourceRow ? `${issue.sourceRow}行目: ` : ''}[{issue.scope}] {issue.field}: {issue.message}</li>)}</ul> : <p>ありません。</p>}</div>;
}

function completeCommonInfo(common: Partial<CommonInfo>): CommonInfo | null {
  if (requiredCommonKeys.some((key) => !String(common[key] ?? '').trim())) return null;
  return {
    programName: common.programName!, documentDate: common.documentDate!, diplomaticMission: common.diplomaticMission!,
    inviterPostalCode: common.inviterPostalCode!, inviterAddress: common.inviterAddress!, inviterName: common.inviterName!, inviterPhone: common.inviterPhone!, inviterExtension: common.inviterExtension ?? '',
    organisationName: common.organisationName!, contactPersonName: common.contactPersonName!, contactPhone: common.contactPhone!, contactExtension: common.contactExtension ?? '',
    invitationPurpose: common.invitationPurpose!, invitationBackground: common.invitationBackground!, relationshipToApplicant: common.relationshipToApplicant!,
  };
}

function ExcelPreview({ result, selectedSequence, onSelectApplicant }: { result: BatchParseResult; selectedSequence: number | null; onSelectApplicant: (applicant: BatchApplicant) => void }) {
  const errors = result.issues.filter((issue) => issue.level === 'error');
  const warnings = result.issues.filter((issue) => issue.level === 'warning');
  const rowErrors = new Set(errors.filter((issue) => issue.scope === 'applicant' && issue.sourceRow).map((issue) => issue.sourceRow));
  const selectedApplicant = result.applicants.find((applicant) => applicant.sequence === selectedSequence) ?? null;
  return <section className="excelPreview">
    <h3>複数人Excel取込結果</h3><p className="fileName">ファイル名: {result.fileName}</p>
    <div className="statsGrid">
      <div><span>読込人数</span><strong>{result.loadedApplicantRows}</strong></div><div><span>有効な申請人数</span><strong>{result.validApplicantCount}</strong></div>
      <div><span>エラー件数</span><strong>{errors.length}</strong></div><div><span>警告件数</span><strong>{warnings.length}</strong></div>
      <div className={result.canGenerateBatch ? 'ready' : 'notReady'}><span>一括生成準備状況</span><strong>{result.canGenerateBatch ? '準備OK' : '未準備'}</strong></div>
    </div>
    <p className="selectedApplicant">現在選択中の申請人: {selectedApplicant ? `${selectedApplicant.sequence}. ${selectedApplicant.passportName}${selectedApplicant.documentNumber ? `／公文書番号: ${selectedApplicant.documentNumber}` : ''}` : '（未選択）'}</p>
    <PreviewGroup title="共通情報の概要" rows={[
      { label: 'プログラム名', value: result.common.programName }, { label: '作成日', value: result.common.documentDate }, { label: '宛先公館', value: result.common.diplomaticMission },
      { label: '招へい人', value: result.common.inviterName }, { label: '担当者所属先', value: result.common.organisationName }, { label: '担当者氏名', value: result.common.contactPersonName },
      { label: '招へい目的', value: result.common.invitationPurpose }, { label: '招へい経緯', value: result.common.invitationBackground }, { label: '申請人との関係', value: result.common.relationshipToApplicant },
    ]} />
    <section className="previewGroup"><h3>申請人一覧</h3><div className="tableWrap"><table><thead><tr><th>選択</th><th>連番</th><th>Excel行</th><th>公文書番号</th><th>氏名</th><th>国籍</th><th>職業</th><th>性別</th><th>生年月日</th><th>年齢</th><th>状態</th></tr></thead><tbody>
      {result.reviewApplicants.map((row) => {
        const applicant = result.applicants.find((item) => item.sequence === row.sequence) ?? null;
        const isSelected = row.sequence === selectedSequence;
        const hasError = row.status === 'error' || rowErrors.has(row.sourceRow);
        return <tr key={`${row.sourceRow}-${row.sequence}`} className={`${hasError ? 'rowError' : ''} ${isSelected ? 'rowSelected' : ''}`.trim()} onClick={() => applicant && onSelectApplicant(applicant)}>
          <td><button type="button" className="selectApplicantButton" disabled={!applicant} onClick={(event) => { event.stopPropagation(); if (applicant) onSelectApplicant(applicant); }}>{isSelected ? '選択中' : applicant ? '選択' : '不可'}</button></td>
          <td>{row.sequence}</td><td>{row.sourceRow}</td><td>{row.documentNumber || '（空欄）'}</td><td>{row.passportName || '（未入力）'}</td><td>{row.nationality || '（未入力）'}</td><td>{row.occupation || '（未入力）'}</td><td>{row.gender || '（未入力）'}</td><td>{row.dateOfBirth || '（未入力）'}</td><td>{row.calculatedAge ?? '（計算不可）'}</td><td>{row.status === 'valid' ? '有効' : row.errors.join('／')}</td>
        </tr>;
      })}
    </tbody></table></div>{result.reviewApplicants.length ? null : <p>申請人は読み込まれていません。</p>}</section>
    <IssueList title="エラー一覧" issues={errors} className="errors" /><IssueList title="警告一覧" issues={warnings} className="warnings" />
  </section>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toJapaneseRenderError(error: unknown) {
  if (error instanceof InvitationRenderError) return error.message; if (error instanceof Error) return error.message; return 'レンダリング中に不明なエラーが発生しました。';
}

async function renderApplicantCanvas(data: InvitationReasonData, documentNumber: string, canvas?: HTMLCanvasElement, debug = false) {
  const rendered = await renderInvitationCanvas(data, { canvas, debug });
  drawDocumentNumber(rendered, documentNumber);
  return rendered;
}

export default function Home() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderMessage, setRenderMessage] = useState('Canvasプレビューを生成できます。');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const [excelResult, setExcelResult] = useState<BatchParseResult | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);

  useEffect(() => { setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1'); }, []);

  function getSelectedUploadedData(): { applicant: BatchApplicant; data: InvitationReasonData } | null {
    const applicant = excelResult?.applicants.find((item) => item.sequence === selectedSequence) ?? null;
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    return applicant && common ? { applicant, data: toInvitationReasonData(common, applicant) } : null;
  }

  async function regeneratePreview(debugOverride = isDebug) {
    setIsRendering(true); setRenderError(null); setRenderMessage('Canvasプレビューを作成しています...');
    try {
      if (!previewCanvasRef.current) throw new InvitationRenderError('CANVAS_CONTEXT', 'Canvasを初期化できませんでした。');
      const selected = getSelectedUploadedData();
      if (selected) await renderApplicantCanvas(selected.data, selected.applicant.documentNumber, previewCanvasRef.current, debugOverride);
      else await renderInvitationCanvas(fixedInvitationReasonSample, { canvas: previewCanvasRef.current, debug: debugOverride });
      setRenderMessage(selected ? `選択中の申請人「${selected.applicant.passportName}」のCanvasプレビューを作成しました。` : '固定サンプルのCanvasプレビューを作成しました。');
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('Canvasプレビューの作成に失敗しました。'); }
    finally { setIsRendering(false); }
  }

  useEffect(() => { void regeneratePreview(isDebug); }, [isDebug, excelResult, selectedSequence]);

  async function downloadCompletedPng() {
    setIsRendering(true); setRenderError(null); setRenderMessage('PNGを作成しています...');
    try {
      const selected = getSelectedUploadedData();
      const canvas = selected ? await renderApplicantCanvas(selected.data, selected.applicant.documentNumber) : await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false });
      const blob = await canvasToPngBlob(canvas); downloadBlob(blob, `${invitationReasonDownloadBaseName}.png`); setRenderMessage('完成PNGを作成しました。');
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('PNG作成に失敗しました。'); } finally { setIsRendering(false); }
  }

  async function downloadCompletedPdf() {
    setIsRendering(true); setRenderError(null); setRenderMessage('PDFを作成しています...');
    try { const canvas = await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false }); const blob = await exportInvitationPdf(canvas); downloadBlob(blob, `${invitationReasonDownloadBaseName}.pdf`); setRenderMessage('固定サンプルPDFを作成しました。'); }
    catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('PDF作成に失敗しました。'); } finally { setIsRendering(false); }
  }

  async function downloadSelectedApplicantPdf() {
    const selected = getSelectedUploadedData(); if (!selected) return;
    setIsRendering(true); setRenderError(null); setRenderMessage('選択中の申請人PDFを作成しています...');
    try { const canvas = await renderApplicantCanvas(selected.data, selected.applicant.documentNumber); const blob = await exportInvitationPdf(canvas); downloadBlob(blob, createInvitationReasonPdfFilename(selected.applicant)); setRenderMessage('選択中の申請人PDFを作成しました。'); }
    catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('選択中の申請人PDF作成に失敗しました。'); } finally { setIsRendering(false); }
  }

  async function downloadAllApplicantsZip() {
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    if (!excelResult || !common || !excelResult.canGenerateBatch || excelResult.applicants.length === 0) return;
    setIsRendering(true); setRenderError(null);
    try {
      const entries: { filename: string; blob: Blob }[] = [];
      for (const [index, applicant] of excelResult.applicants.entries()) {
        setRenderMessage(`全員分PDFを作成しています... ${index + 1}/${excelResult.applicants.length} ${applicant.passportName}`);
        const canvas = await renderApplicantCanvas(toInvitationReasonData(common, applicant), applicant.documentNumber);
        entries.push({ filename: createInvitationReasonPdfFilename(applicant), blob: await exportInvitationPdf(canvas) });
      }
      setRenderMessage('ZIPファイルを作成しています...');
      downloadBlob(await createZipBlob(entries), 'InvitationReason_AllApplicants.zip');
      setRenderMessage(`${entries.length}名分のPDFをZIPで作成しました。`);
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('全員分PDFの一括作成に失敗しました。'); } finally { setIsRendering(false); }
  }

  async function downloadExcelTemplate() { const XLSX = await loadXlsx(); XLSX.writeFile(createBatchWorkbook(XLSX), batchTemplateFilename); }

  async function handleExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { const XLSX = await loadXlsx(); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); const result = parseBatchWorkbook(XLSX, workbook, file.name); setExcelResult(result); setSelectedSequence(result.applicants[0]?.sequence ?? null); }
    catch (caughtError) { setExcelResult({ fileName: file.name, common: {}, reviewApplicants: [], applicants: [], loadedApplicantRows: 0, validApplicantCount: 0, canGenerateBatch: false, issues: [{ level: 'error', scope: 'common', field: 'file', message: caughtError instanceof Error ? caughtError.message : 'Excelファイルの読み込みに失敗しました。' }] }); setSelectedSequence(null); }
    event.target.value = '';
  }

  const selectedReady = getSelectedUploadedData() !== null;
  const batchReady = Boolean(excelResult?.canGenerateBatch && excelResult.applicants.length);

  return <main>
    <section className="hero"><p className="eyebrow">招へい理由書 作成ツール</p><h1>複数申請人Excel取込とPDF作成</h1><p>申請人ごとに任意の公文書番号を指定し、個別PDFまたは全員分ZIPを作成できます。</p></section>
    <section className="rendererSection"><p className="eyebrow">Canvas PDF Renderer</p><h2>選択申請人プレビュー</h2><p>公文書番号は右上の日付の上に表示され、日付の「日」と右端が揃います。空欄の場合は何も表示しません。</p><div className="buttonRow"><button type="button" onClick={() => regeneratePreview(isDebug)} disabled={isRendering}>{isRendering ? '処理中...' : 'プレビューを再生成'}</button><button type="button" onClick={downloadCompletedPng} disabled={isRendering}>完成PNGをダウンロード</button><button type="button" onClick={downloadCompletedPdf} disabled={isRendering}>固定サンプルPDFをダウンロード</button><button type="button" onClick={downloadSelectedApplicantPdf} disabled={isRendering || !selectedReady}>選択中の1名をPDFでダウンロード</button><button type="button" onClick={downloadAllApplicantsZip} disabled={isRendering || !batchReady}>有効な申請人全員をZIPでダウンロード</button></div><div className="canvasFrame"><canvas ref={previewCanvasRef} width={2481} height={3508} aria-label="招へい理由書Canvasプレビュー" /></div><div className="result" aria-live="polite"><h3>レンダリング状況</h3><p>{renderMessage}</p>{renderError ? <p className="error">{renderError}</p> : null}</div></section>
    <section className="excelSection"><p className="eyebrow">Excel入力</p><h2>複数人用Excelテンプレートのダウンロード・アップロード</h2><p>「申請人一覧」の「公文書番号（任意）」列に、各申請人の番号を入力してください。空欄でもPDFを作成できます。</p><div className="buttonRow"><button type="button" onClick={downloadExcelTemplate}>複数人用Excelテンプレートをダウンロード</button><label className="uploadButton">Excelファイルをアップロード<input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} /></label></div>{excelResult ? <ExcelPreview result={excelResult} selectedSequence={selectedSequence} onSelectApplicant={(applicant) => setSelectedSequence(applicant.sequence)} /> : null}</section>
  </main>;
}
