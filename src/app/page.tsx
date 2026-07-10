'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { BatchParseResult, ValidationIssue } from '../domain/batchApplicant';
import { fixedInvitationReasonSample, invitationReasonDownloadBaseName } from '../domain/invitationReasonData';
import { batchTemplateFilename, createBatchWorkbook, parseBatchWorkbook } from '../lib/batchExcel';
import { canvasToPngBlob, InvitationRenderError } from '../pdf/canvasText';
import { exportInvitationPdf } from '../pdf/exportInvitationPdf';
import { renderInvitationCanvas } from '../pdf/renderInvitationCanvas';

type XlsxModule = typeof import('xlsx/xlsx.mjs');

async function loadXlsx(): Promise<XlsxModule> { return import('xlsx/xlsx.mjs'); }

function PreviewGroup({ title, rows }: { title: string; rows: { label: string; value: string | number | undefined }[] }) {
  return (
    <section className="previewGroup">
      <h3>{title}</h3>
      <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value || '（未入力）'}</dd></div>)}</dl>
    </section>
  );
}

function IssueList({ title, issues, className }: { title: string; issues: ValidationIssue[]; className: string }) {
  return <div className={`validationBlock ${className}`}><h3>{title}</h3>{issues.length ? <ul>{issues.map((issue, index) => <li key={`${issue.level}-${issue.scope}-${issue.sourceRow}-${issue.field}-${index}`}>{issue.sourceRow ? `${issue.sourceRow}行目: ` : ''}[{issue.scope}] {issue.field}: {issue.message}</li>)}</ul> : <p>ありません。</p>}</div>;
}

function ExcelPreview({ result }: { result: BatchParseResult }) {
  const errors = result.issues.filter((issue) => issue.level === 'error');
  const warnings = result.issues.filter((issue) => issue.level === 'warning');
  return (
    <section className="excelPreview">
      <h3>複数人Excel取込結果</h3>
      <p className="fileName">ファイル名: {result.fileName}</p>
      <div className="statsGrid">
        <div><span>読込人数</span><strong>{result.loadedApplicantRows}</strong></div>
        <div><span>有効な申請人数</span><strong>{result.validApplicantCount}</strong></div>
        <div><span>エラー件数</span><strong>{errors.length}</strong></div>
        <div><span>警告件数</span><strong>{warnings.length}</strong></div>
        <div className={result.canGenerateBatch ? 'ready' : 'notReady'}><span>一括生成準備状況</span><strong>{result.canGenerateBatch ? '準備OK' : '未準備'}</strong></div>
      </div>
      <PreviewGroup title="共通情報の概要" rows={[
        { label: 'プログラム名', value: result.common.programName },
        { label: '作成日', value: result.common.documentDate },
        { label: '宛先公館', value: result.common.diplomaticMission },
        { label: '招へい人', value: result.common.inviterName },
        { label: '担当者所属先', value: result.common.organisationName },
        { label: '担当者氏名', value: result.common.contactPersonName },
        { label: '招へい目的', value: result.common.invitationPurpose },
        { label: '招へい経緯', value: result.common.invitationBackground },
        { label: '申請人との関係', value: result.common.relationshipToApplicant },
      ]} />
      <section className="previewGroup">
        <h3>申請人一覧</h3>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>連番</th><th>Excel行</th><th>氏名</th><th>国籍</th><th>職業</th><th>性別</th><th>生年月日</th><th>自動計算年齢</th><th>状態</th></tr>
            </thead>
            <tbody>
              {result.reviewApplicants.map((applicant) => (
                <tr key={`${applicant.sourceRow}-${applicant.sequence}`} className={applicant.status === 'error' ? 'rowError' : ''}>
                  <td>{applicant.sequence}</td>
                  <td>{applicant.sourceRow}</td>
                  <td>{applicant.passportName || '（未入力）'}</td>
                  <td>{applicant.nationality || '（未入力）'}</td>
                  <td>{applicant.occupation || '（未入力）'}</td>
                  <td>{applicant.gender || '（未入力）'}</td>
                  <td>{applicant.dateOfBirth || '（未入力）'}</td>
                  <td>{applicant.calculatedAge ?? '（計算不可）'}</td>
                  <td>{applicant.status === 'valid' ? '有効' : applicant.errors.join('／')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.reviewApplicants.length ? null : <p>申請人は読み込まれていません。</p>}
      </section>
      <IssueList title="エラー一覧" issues={errors} className="errors" />
      <IssueList title="警告一覧" issues={warnings} className="warnings" />
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
  const [excelResult, setExcelResult] = useState<BatchParseResult | null>(null);

  useEffect(() => { setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1'); }, []);

  async function regeneratePreview(debugOverride = isDebug) {
    setIsRendering(true); setRenderError(null); setRenderMessage('Canvasプレビューを作成しています...');
    try {
      if (!previewCanvasRef.current) throw new InvitationRenderError('CANVAS_CONTEXT', 'Canvasを初期化できませんでした。');
      await renderInvitationCanvas(fixedInvitationReasonSample, { canvas: previewCanvasRef.current, debug: debugOverride });
      setRenderMessage(debugOverride ? 'デバッグ枠付きCanvasプレビューを作成しました。ダウンロードにはデバッグ枠は入りません。' : 'Canvasプレビューを作成しました。');
    } catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('Canvasプレビューの作成に失敗しました。'); }
    finally { setIsRendering(false); }
  }
  useEffect(() => { void regeneratePreview(isDebug); }, [isDebug]);

  async function downloadCompletedPng() {
    setIsRendering(true); setRenderError(null); setRenderMessage('PNGを作成しています...');
    try { const canvas = await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false }); const blob = await canvasToPngBlob(canvas); downloadBlob(blob, `${invitationReasonDownloadBaseName}.png`); setRenderMessage('完成PNGを作成しました。ダウンロードをご確認ください。'); }
    catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('PNG作成に失敗しました。'); }
    finally { setIsRendering(false); }
  }

  async function downloadCompletedPdf() {
    setIsRendering(true); setRenderError(null); setRenderMessage('PDFを作成しています...');
    try { const canvas = await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false }); const blob = await exportInvitationPdf(canvas); downloadBlob(blob, `${invitationReasonDownloadBaseName}.pdf`); setRenderMessage('完成PDFを作成しました。ダウンロードをご確認ください。'); }
    catch (caughtError) { console.error(caughtError); setRenderError(toJapaneseRenderError(caughtError)); setRenderMessage('PDF作成に失敗しました。'); }
    finally { setIsRendering(false); }
  }

  async function downloadExcelTemplate() { const XLSX = await loadXlsx(); XLSX.writeFile(createBatchWorkbook(XLSX), batchTemplateFilename); }

  async function handleExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { const XLSX = await loadXlsx(); const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); setExcelResult(parseBatchWorkbook(XLSX, workbook, file.name)); }
    catch (caughtError) { setExcelResult({ fileName: file.name, common: {}, reviewApplicants: [], applicants: [], loadedApplicantRows: 0, validApplicantCount: 0, canGenerateBatch: false, issues: [{ level: 'error', scope: 'common', field: 'file', message: caughtError instanceof Error ? caughtError.message : 'Excelファイルの読み込みに失敗しました。' }] }); }
    event.target.value = '';
  }

  return (
    <main>
      <section className="hero"><p className="eyebrow">招へい理由書 作成ツール</p><h1>複数申請人Excel取込と固定サンプルPDF作成</h1><p>Phase 1では複数人用Excelテンプレート、読込、検証、一覧表示を追加します。アップロードデータはPDF生成へ接続しません。</p></section>
      <section className="rendererSection"><p className="eyebrow">Fixed sample renderer</p><h2>Canvas PDF Renderer - Proof of Concept</h2><p>この検証版ではExcelデータをPDF生成へ接続せず、固定サンプル1名分だけを描画します。{isDebug ? ' debug=1 のためプレビューに赤い配置枠を表示しています。' : ''}</p><div className="buttonRow"><button type="button" onClick={() => regeneratePreview(isDebug)} disabled={isRendering}>{isRendering ? '処理中...' : 'プレビューを再生成'}</button><button type="button" onClick={downloadCompletedPng} disabled={isRendering}>完成PNGをダウンロード</button><button type="button" onClick={downloadCompletedPdf} disabled={isRendering}>完成PDFをダウンロード</button></div><div className="canvasFrame"><canvas ref={previewCanvasRef} width={2481} height={3508} aria-label="招へい理由書Canvasプレビュー" /></div><div className="result" aria-live="polite"><h3>レンダリング状況</h3><p>{renderMessage}</p>{renderError ? <p className="error">{renderError}</p> : null}</div></section>
      <section className="excelSection"><p className="eyebrow">Excel入力（Phase 1）</p><h2>複数人用Excelテンプレートのダウンロード・アップロード</h2><p>「共通情報」と「申請人一覧」の2シートを読み込み、年齢計算と全体validationを行います。申請人選択、PDF接続、個別PDF、ZIP出力は未実装です。</p><div className="buttonRow"><button type="button" onClick={downloadExcelTemplate}>複数人用Excelテンプレートをダウンロード</button><label className="uploadButton">Excelファイルをアップロード<input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} /></label></div>{excelResult ? <ExcelPreview result={excelResult} /> : null}</section>
    </main>
  );
}
