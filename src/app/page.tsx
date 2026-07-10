'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { BatchApplicant, BatchParseResult, CommonInfo, ValidationIssue } from '../domain/batchApplicant';
import { requiredCommonKeys } from '../domain/batchApplicant';
import { createInvitationReasonPdfFilename, toInvitationReasonData } from '../domain/batchInvitationMapping';
import {
  createGuaranteeLetterPdfFilename,
  defaultGuaranteeLetterSettings,
  toGuaranteeLetterData,
  type GuaranteeLetterSettings,
  type MissionType,
} from '../domain/guaranteeLetterData';
import { fixedInvitationReasonSample, invitationReasonDownloadBaseName, type InvitationReasonData } from '../domain/invitationReasonData';
import { batchTemplateFilename, createBatchWorkbook, parseBatchWorkbook } from '../lib/batchExcel';
import { createZipBlob } from '../lib/zip';
import { canvasToPngBlob, InvitationRenderError } from '../pdf/canvasText';
import { drawDocumentNumber } from '../pdf/drawDocumentNumber';
import { exportInvitationPdf } from '../pdf/exportInvitationPdf';
import { GUARANTEE_CANVAS_HEIGHT, GUARANTEE_CANVAS_WIDTH, renderGuaranteeCanvas } from '../pdf/renderGuaranteeCanvas';
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
  const guaranteeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderMessage, setRenderMessage] = useState('Canvasプレビューを生成できます。');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const [excelResult, setExcelResult] = useState<BatchParseResult | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
  const [guaranteeSettings, setGuaranteeSettings] = useState<GuaranteeLetterSettings>(defaultGuaranteeLetterSettings);

  useEffect(() => { setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1'); }, []);

  function getSelectedUploadedData(): { applicant: BatchApplicant; data: InvitationReasonData; common: CommonInfo } | null {
    const applicant = excelResult?.applicants.find((item) => item.sequence === selectedSequence) ?? null;
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    return applicant && common ? { applicant, common, data: toInvitationReasonData(common, applicant) } : null;
  }

  function getSelectedGuaranteeData() {
    const selected = getSelectedUploadedData();
    return selected ? { ...selected, guarantee: toGuaranteeLetterData(selected.common, selected.applicant, guaranteeSettings) } : null;
  }

  async function regeneratePreview(debugOverride = isDebug) {
    setIsRendering(true); setRenderError(null); setRenderMessage('Canvasプレビューを作成しています...');
    try {
      if (!previewCanvasRef.current) throw new InvitationRenderError('CANVAS_CONTEXT', 'Canvasを初期化できませんでした。');
      const selected = getSelectedUploadedData();
      if (selected) await renderApplicantCanvas(selected.data, selected.applicant.documentNumber, previewCanvasRef.current, debugOverride);
      else await renderInvitationCanvas(fixedInvitationReasonSample, { canvas: previewCanvasRef.current, debug: debugOverride });
      if (guaranteeCanvasRef.current && selected) await renderGuaranteeCanvas(toGuaranteeLetterData(selected.common, selected.applicant, guaranteeSettings), guaranteeCanvasRef.current);
      setRenderMessage(selected ? `選択中の申請人「${selected.applicant.passportName}」の2種類のプレビューを作成しました。` : '固定サンプルの招へい理由書プレビューを作成しました。');
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('Canvasプレビューの作成に失敗しました。'); }
    finally { setIsRendering(false); }
  }

  useEffect(() => { void regeneratePreview(isDebug); }, [isDebug, excelResult, selectedSequence, guaranteeSettings]);

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

  async function downloadSelectedGuaranteePdf() {
    const selected = getSelectedGuaranteeData(); if (!selected) return;
    setIsRendering(true); setRenderError(null); setRenderMessage('身元保証書PDFを作成しています...');
    try { const canvas = await renderGuaranteeCanvas(selected.guarantee); const blob = await exportInvitationPdf(canvas); downloadBlob(blob, createGuaranteeLetterPdfFilename(selected.applicant)); setRenderMessage('選択中の申請人の身元保証書PDFを作成しました。'); }
    catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('身元保証書PDF作成に失敗しました。'); } finally { setIsRendering(false); }
  }

  async function downloadSelectedDocumentSet() {
    const selected = getSelectedGuaranteeData(); if (!selected) return;
    setIsRendering(true); setRenderError(null); setRenderMessage('2種類のPDFを作成しています...');
    try {
      const invitationCanvas = await renderApplicantCanvas(selected.data, selected.applicant.documentNumber);
      const guaranteeCanvas = await renderGuaranteeCanvas(selected.guarantee);
      const entries = [
        { filename: createInvitationReasonPdfFilename(selected.applicant), blob: await exportInvitationPdf(invitationCanvas) },
        { filename: createGuaranteeLetterPdfFilename(selected.applicant), blob: await exportInvitationPdf(guaranteeCanvas) },
      ];
      downloadBlob(await createZipBlob(entries), `VisaDocuments_${selected.applicant.passportName.replace(/\s+/g, '_')}.zip`);
      setRenderMessage('招へい理由書と身元保証書をZIPで作成しました。');
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('書類セット作成に失敗しました。'); } finally { setIsRendering(false); }
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

  async function downloadAllGuaranteeLettersZip() {
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    if (!excelResult || !common || !excelResult.canGenerateBatch || excelResult.applicants.length === 0) return;
    setIsRendering(true); setRenderError(null);
    try {
      const entries: { filename: string; blob: Blob }[] = [];
      for (const [index, applicant] of excelResult.applicants.entries()) {
        setRenderMessage(`身元保証書を作成しています... ${index + 1}/${excelResult.applicants.length} ${applicant.passportName}`);
        const canvas = await renderGuaranteeCanvas(toGuaranteeLetterData(common, applicant, guaranteeSettings));
        entries.push({ filename: createGuaranteeLetterPdfFilename(applicant), blob: await exportInvitationPdf(canvas) });
      }
      downloadBlob(await createZipBlob(entries), 'GuaranteeLetter_AllApplicants.zip');
      setRenderMessage(`${entries.length}名分の身元保証書をZIPで作成しました。`);
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('身元保証書の一括作成に失敗しました。'); } finally { setIsRendering(false); }
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
    <section className="hero"><p className="eyebrow">ビザ申請書類 作成ツール</p><h1>招へい理由書と身元保証書</h1><p>同じ申請人データから、1名につき1通の招へい理由書と身元保証書を作成できます。</p></section>

    <section className="excelSection"><p className="eyebrow">身元保証書設定</p><h2>保証人情報</h2><p>公館種別と職業は任意です。大使館・総領事館を未選択のまま出力し、提出時に手書きでチェックすることもできます。</p>
      <div className="previewGroup">
        <label>所属・肩書・氏名<input value={guaranteeSettings.guarantorName} onChange={(event) => setGuaranteeSettings((current) => ({ ...current, guarantorName: event.target.value }))} /></label>
        <label>職業（任意）<input value={guaranteeSettings.guarantorOccupation} onChange={(event) => setGuaranteeSettings((current) => ({ ...current, guarantorOccupation: event.target.value }))} /></label>
        <label>生年月日<input type="date" value={guaranteeSettings.guarantorDateOfBirth} onChange={(event) => setGuaranteeSettings((current) => ({ ...current, guarantorDateOfBirth: event.target.value }))} /></label>
        <label>公館種別<select value={guaranteeSettings.missionType} onChange={(event) => setGuaranteeSettings((current) => ({ ...current, missionType: event.target.value as MissionType }))}><option value="none">未選択</option><option value="embassy">大使館</option><option value="consulate">総領事館</option></select></label>
        <label>保証人FAX（任意）<input value={guaranteeSettings.guarantorFax} onChange={(event) => setGuaranteeSettings((current) => ({ ...current, guarantorFax: event.target.value }))} /></label>
        <label>担当者FAX（任意）<input value={guaranteeSettings.contactFax} onChange={(event) => setGuaranteeSettings((current) => ({ ...current, contactFax: event.target.value }))} /></label>
      </div>
    </section>

    <section className="rendererSection"><p className="eyebrow">Canvas PDF Renderer</p><h2>選択申請人プレビュー</h2><div className="buttonRow"><button type="button" onClick={() => regeneratePreview(isDebug)} disabled={isRendering}>{isRendering ? '処理中...' : 'プレビューを再生成'}</button><button type="button" onClick={downloadCompletedPng} disabled={isRendering}>招へい理由書PNG</button><button type="button" onClick={downloadCompletedPdf} disabled={isRendering}>固定サンプルPDF</button><button type="button" onClick={downloadSelectedApplicantPdf} disabled={isRendering || !selectedReady}>招へい理由書PDF</button><button type="button" onClick={downloadSelectedGuaranteePdf} disabled={isRendering || !selectedReady}>身元保証書PDF</button><button type="button" onClick={downloadSelectedDocumentSet} disabled={isRendering || !selectedReady}>2書類をZIP</button><button type="button" onClick={downloadAllApplicantsZip} disabled={isRendering || !batchReady}>全員の招へい理由書ZIP</button><button type="button" onClick={downloadAllGuaranteeLettersZip} disabled={isRendering || !batchReady}>全員の身元保証書ZIP</button></div>
      <h3>招へい理由書</h3><div className="canvasFrame"><canvas ref={previewCanvasRef} width={2481} height={3508} aria-label="招へい理由書Canvasプレビュー" /></div>
      <h3>身元保証書</h3><div className="canvasFrame"><canvas ref={guaranteeCanvasRef} width={GUARANTEE_CANVAS_WIDTH} height={GUARANTEE_CANVAS_HEIGHT} aria-label="身元保証書Canvasプレビュー" /></div>
      <div className="result" aria-live="polite"><h3>レンダリング状況</h3><p>{renderMessage}</p>{renderError ? <p className="error">{renderError}</p> : null}</div>
    </section>

    <section className="excelSection"><p className="eyebrow">Excel入力</p><h2>複数人用Excelテンプレートのダウンロード・アップロード</h2><p>身元保証書自体は1名につき1通作成します。Excelに複数人がある場合も、申請人ごとに別々のPDFを出力します。</p><div className="buttonRow"><button type="button" onClick={downloadExcelTemplate}>複数人用Excelテンプレートをダウンロード</button><label className="uploadButton">Excelファイルをアップロード<input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} /></label></div>{excelResult ? <ExcelPreview result={excelResult} selectedSequence={selectedSequence} onSelectApplicant={(applicant) => setSelectedSequence(applicant.sequence)} /> : null}</section>
  </main>;
}
