'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { BatchApplicant, BatchParseResult, CommonInfo, ValidationIssue } from '../domain/batchApplicant';
import { requiredCommonKeys } from '../domain/batchApplicant';
import { createInvitationReasonPdfFilename, toInvitationReasonData } from '../domain/batchInvitationMapping';
import {
  createGuaranteeLetterPdfFilename,
  defaultGuaranteeLetterSettings,
  fixedGuaranteeLetterSample,
  toGuaranteeLetterData,
  type GuaranteeLetterData,
  type GuaranteeLetterSettings,
  type MissionType,
} from '../domain/guaranteeLetterData';
import {
  calculateAgeFromDates,
  fixedInvitationReasonSample,
  invitationReasonDownloadBaseName,
  type InvitationReasonData,
} from '../domain/invitationReasonData';
import { batchTemplateFilename, createBatchWorkbook, parseBatchWorkbook } from '../lib/batchExcel';
import { createZipBlob } from '../lib/zip';
import { canvasToPngBlob, InvitationRenderError } from '../pdf/canvasText';
import { drawDocumentNumber } from '../pdf/drawDocumentNumber';
import { exportInvitationPdf } from '../pdf/exportInvitationPdf';
import {
  GUARANTEE_CANVAS_HEIGHT,
  GUARANTEE_CANVAS_WIDTH,
  renderGuaranteeCanvas,
} from '../pdf/renderGuaranteeCanvas';
import { renderInvitationCanvas } from '../pdf/renderInvitationCanvas';

type XlsxModule = typeof import('xlsx/xlsx.mjs');
type PreviewMode = 'invitation' | 'guarantee' | 'both';
type SidebarTab = 'applicant' | 'document' | 'guarantor';

async function loadXlsx(): Promise<XlsxModule> {
  return import('xlsx/xlsx.mjs');
}

function formatJapanDateTime(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date);
}

function ReadOnlyField({ label, value }: { label: string; value: string | number | null | undefined }) {
  const displayValue = value === null || value === undefined || value === '' ? '（未入力）' : String(value);
  return (
    <div className="readOnlyField">
      <dt>{label}</dt>
      <dd>{displayValue}</dd>
    </div>
  );
}

function IssueList({
  title,
  issues,
  className,
}: {
  title: string;
  issues: ValidationIssue[];
  className: string;
}) {
  if (!issues.length) return null;
  return (
    <details className={`issueList ${className}`}>
      <summary>{title}（{issues.length}件）</summary>
      <ul>
        {issues.map((issue, index) => (
          <li key={`${issue.level}-${issue.scope}-${issue.sourceRow}-${issue.field}-${index}`}>
            {issue.sourceRow ? `Excel ${issue.sourceRow}行目：` : ''}
            {issue.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

function completeCommonInfo(common: Partial<CommonInfo>): CommonInfo | null {
  if (requiredCommonKeys.some((key) => !String(common[key] ?? '').trim())) return null;
  return {
    programName: common.programName!,
    documentDate: common.documentDate!,
    diplomaticMission: common.diplomaticMission!,
    inviterPostalCode: common.inviterPostalCode!,
    inviterAddress: common.inviterAddress!,
    inviterName: common.inviterName!,
    inviterPhone: common.inviterPhone!,
    inviterExtension: common.inviterExtension ?? '',
    organisationName: common.organisationName!,
    contactPersonName: common.contactPersonName!,
    contactPhone: common.contactPhone!,
    contactExtension: common.contactExtension ?? '',
    invitationPurpose: common.invitationPurpose!,
    invitationBackground: common.invitationBackground!,
    relationshipToApplicant: common.relationshipToApplicant!,
  };
}

function ApplicantList({
  result,
  selectedSequence,
  onSelectApplicant,
}: {
  result: BatchParseResult;
  selectedSequence: number | null;
  onSelectApplicant: (applicant: BatchApplicant) => void;
}) {
  const errors = result.issues.filter((issue) => issue.level === 'error');
  const warnings = result.issues.filter((issue) => issue.level === 'warning');
  const rowErrors = new Set(
    errors
      .filter((issue) => issue.scope === 'applicant' && issue.sourceRow)
      .map((issue) => issue.sourceRow),
  );

  return (
    <>
      <div className="compactStats" aria-label="Excel読込結果">
        <div><span>読込</span><strong>{result.loadedApplicantRows}</strong></div>
        <div><span>作成可能</span><strong>{result.validApplicantCount}</strong></div>
        <div className={errors.length ? 'statError' : ''}><span>エラー</span><strong>{errors.length}</strong></div>
        <div className={warnings.length ? 'statWarning' : ''}><span>警告</span><strong>{warnings.length}</strong></div>
      </div>

      <div className={`readinessBanner ${result.canGenerateBatch ? 'ready' : 'notReady'}`}>
        <strong>{result.canGenerateBatch ? '書類作成準備：完了' : '書類作成準備：要確認'}</strong>
        <span>
          {result.canGenerateBatch
            ? `${result.validApplicantCount}名分の書類を作成できます。`
            : 'エラー内容を確認し、Excelを修正して再アップロードしてください。'}
        </span>
      </div>

      <div className="applicantList" role="list" aria-label="申請人一覧">
        {result.reviewApplicants.map((row) => {
          const applicant = result.applicants.find((item) => item.sequence === row.sequence) ?? null;
          const isSelected = row.sequence === selectedSequence;
          const hasError = row.status === 'error' || rowErrors.has(row.sourceRow);
          return (
            <button
              key={`${row.sourceRow}-${row.sequence}`}
              type="button"
              className={`applicantRow ${isSelected ? 'selected' : ''} ${hasError ? 'hasError' : ''}`}
              disabled={!applicant}
              onClick={() => applicant && onSelectApplicant(applicant)}
            >
              <span className="applicantSequence">{String(row.sequence).padStart(2, '0')}</span>
              <span className="applicantIdentity">
                <strong>{row.passportName || '氏名未入力'}</strong>
                <small>{row.nationality || '国籍未入力'}／Excel {row.sourceRow}行目</small>
              </span>
              <span className={`statusBadge ${hasError ? 'error' : 'valid'}`}>
                {hasError ? 'エラー' : isSelected ? '選択中' : '作成可能'}
              </span>
            </button>
          );
        })}
        {!result.reviewApplicants.length ? <p className="emptyState">申請人は読み込まれていません。</p> : null}
      </div>

      <IssueList title="エラーを確認" issues={errors} className="errors" />
      <IssueList title="警告を確認" issues={warnings} className="warnings" />
    </>
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

async function renderApplicantCanvas(
  data: InvitationReasonData,
  documentNumber: string,
  canvas?: HTMLCanvasElement,
  debug = false,
) {
  const rendered = await renderInvitationCanvas(data, { canvas, debug });
  drawDocumentNumber(rendered, documentNumber);
  return rendered;
}

export default function Home() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const guaranteeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderMessage, setRenderMessage] = useState('プレビューを生成できます。');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [guaranteePreviewMessage, setGuaranteePreviewMessage] = useState(
    '身元保証書の正式様式を読み込んでいます...',
  );
  const [guaranteePreviewError, setGuaranteePreviewError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const [excelResult, setExcelResult] = useState<BatchParseResult | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
  const [guaranteeSettings, setGuaranteeSettings] = useState<GuaranteeLetterSettings>(
    defaultGuaranteeLetterSettings,
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>('invitation');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('applicant');
  const [japanTime, setJapanTime] = useState('日本時間を取得しています...');
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);

  useEffect(() => {
    setIsDebug(new URLSearchParams(window.location.search).get('debug') === '1');
  }, []);

  useEffect(() => {
    const update = () => setJapanTime(formatJapanDateTime(new Date()));
    update();
    const intervalId = window.setInterval(update, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  function getSelectedUploadedData(): {
    applicant: BatchApplicant;
    data: InvitationReasonData;
    common: CommonInfo;
  } | null {
    const applicant = excelResult?.applicants.find(
      (item) => item.sequence === selectedSequence,
    ) ?? null;
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    return applicant && common
      ? { applicant, common, data: toInvitationReasonData(common, applicant) }
      : null;
  }

  function getSelectedGuaranteeData() {
    const selected = getSelectedUploadedData();
    return selected
      ? {
          ...selected,
          guarantee: toGuaranteeLetterData(
            selected.common,
            selected.applicant,
            guaranteeSettings,
          ),
        }
      : null;
  }

  function getGuaranteePreviewData(): GuaranteeLetterData {
    const selected = getSelectedGuaranteeData();
    if (selected) return selected.guarantee;

    const guarantorDateOfBirth = guaranteeSettings.guarantorDateOfBirth.trim();
    return {
      ...fixedGuaranteeLetterSample,
      missionType: guaranteeSettings.missionType,
      guarantorOccupation: guaranteeSettings.guarantorOccupation.trim(),
      guarantorName: guaranteeSettings.guarantorName.trim()
        || fixedGuaranteeLetterSample.guarantorName,
      guarantorDateOfBirth,
      guarantorAge: guarantorDateOfBirth
        ? calculateAgeFromDates(fixedGuaranteeLetterSample.documentDate, guarantorDateOfBirth)
        : null,
      guarantorFax: guaranteeSettings.guarantorFax.trim(),
      contactFax: guaranteeSettings.contactFax.trim(),
    };
  }

  async function regeneratePreview(debugOverride = isDebug) {
    setIsRendering(true);
    setRenderError(null);
    setGuaranteePreviewError(null);
    setRenderMessage('プレビューを作成しています...');
    setGuaranteePreviewMessage('身元保証書の正式様式を読み込んでいます...');

    const selected = getSelectedUploadedData();
    let invitationSucceeded = false;
    let guaranteeSucceeded = false;

    try {
      if (!previewCanvasRef.current) {
        throw new InvitationRenderError('CANVAS_CONTEXT', '招へい理由書Canvasを初期化できませんでした。');
      }
      if (selected) {
        await renderApplicantCanvas(
          selected.data,
          selected.applicant.documentNumber,
          previewCanvasRef.current,
          debugOverride,
        );
      } else {
        await renderInvitationCanvas(fixedInvitationReasonSample, {
          canvas: previewCanvasRef.current,
          debug: debugOverride,
        });
      }
      invitationSucceeded = true;
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
    }

    try {
      if (!guaranteeCanvasRef.current) {
        throw new InvitationRenderError('CANVAS_CONTEXT', '身元保証書Canvasを初期化できませんでした。');
      }
      await renderGuaranteeCanvas(getGuaranteePreviewData(), {
        canvas: guaranteeCanvasRef.current,
        debug: debugOverride,
      });
      guaranteeSucceeded = true;
      setGuaranteePreviewMessage(
        selected
          ? `選択中の申請人「${selected.applicant.passportName}」の身元保証書を表示しています。`
          : '正式様式上に固定サンプルを表示しています。',
      );
    } catch (caughtError) {
      console.error(caughtError);
      setGuaranteePreviewError(toJapaneseRenderError(caughtError));
      setGuaranteePreviewMessage('身元保証書の描画を停止しました。白紙での代替表示は行いません。');
    }

    if (invitationSucceeded && guaranteeSucceeded) {
      setRenderMessage(
        selected
          ? `「${selected.applicant.passportName}」の2種類のプレビューを更新しました。`
          : '2種類の固定サンプルプレビューを作成しました。',
      );
    } else if (invitationSucceeded) {
      setRenderMessage('招へい理由書は作成できましたが、身元保証書の作成に失敗しました。');
    } else if (guaranteeSucceeded) {
      setRenderMessage('身元保証書は作成できましたが、招へい理由書の作成に失敗しました。');
    } else {
      setRenderMessage('2種類のプレビュー作成に失敗しました。');
    }

    setIsRendering(false);
  }

  useEffect(() => {
    void regeneratePreview(isDebug);
  }, [isDebug, excelResult, selectedSequence, guaranteeSettings]);

  async function downloadCompletedPng() {
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('PNGを作成しています...');
    try {
      const selected = getSelectedUploadedData();
      const canvas = selected
        ? await renderApplicantCanvas(selected.data, selected.applicant.documentNumber)
        : await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false });
      const blob = await canvasToPngBlob(canvas);
      downloadBlob(blob, `${invitationReasonDownloadBaseName}.png`);
      setRenderMessage('確認用PNGを作成しました。');
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
    setRenderMessage('固定サンプルPDFを作成しています...');
    try {
      const canvas = await renderInvitationCanvas(fixedInvitationReasonSample, { debug: false });
      const blob = await exportInvitationPdf(canvas);
      downloadBlob(blob, `${invitationReasonDownloadBaseName}.pdf`);
      setRenderMessage('固定サンプルPDFを作成しました。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('PDF作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadSelectedApplicantPdf() {
    const selected = getSelectedUploadedData();
    if (!selected) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('招へい理由書PDFを作成しています...');
    try {
      const canvas = await renderApplicantCanvas(
        selected.data,
        selected.applicant.documentNumber,
      );
      const blob = await exportInvitationPdf(canvas);
      downloadBlob(blob, createInvitationReasonPdfFilename(selected.applicant));
      setRenderMessage('選択中の申請人の招へい理由書PDFを作成しました。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('招へい理由書PDF作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadSelectedGuaranteePdf() {
    const selected = getSelectedGuaranteeData();
    if (!selected) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('身元保証書PDFを作成しています...');
    try {
      const canvas = await renderGuaranteeCanvas(selected.guarantee);
      const blob = await exportInvitationPdf(canvas);
      downloadBlob(blob, createGuaranteeLetterPdfFilename(selected.applicant));
      setRenderMessage('選択中の申請人の身元保証書PDFを作成しました。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('身元保証書PDF作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadSelectedDocumentSet() {
    const selected = getSelectedGuaranteeData();
    if (!selected) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderMessage('2種類のPDFを作成しています...');
    try {
      const invitationCanvas = await renderApplicantCanvas(
        selected.data,
        selected.applicant.documentNumber,
      );
      const guaranteeCanvas = await renderGuaranteeCanvas(selected.guarantee);
      const entries = [
        {
          filename: createInvitationReasonPdfFilename(selected.applicant),
          blob: await exportInvitationPdf(invitationCanvas),
        },
        {
          filename: createGuaranteeLetterPdfFilename(selected.applicant),
          blob: await exportInvitationPdf(guaranteeCanvas),
        },
      ];
      downloadBlob(
        await createZipBlob(entries),
        `VisaDocuments_${selected.applicant.passportName.replace(/\s+/g, '_')}.zip`,
      );
      setRenderMessage('招へい理由書と身元保証書をZIPで作成しました。');
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('書類セット作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadAllApplicantsZip() {
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    if (!excelResult || !common || !excelResult.canGenerateBatch || excelResult.applicants.length === 0) return;
    setIsRendering(true);
    setRenderError(null);
    try {
      const entries: { filename: string; blob: Blob }[] = [];
      for (const [index, applicant] of excelResult.applicants.entries()) {
        setRenderMessage(
          `全員分の招へい理由書を作成しています... ${index + 1}/${excelResult.applicants.length} ${applicant.passportName}`,
        );
        const canvas = await renderApplicantCanvas(
          toInvitationReasonData(common, applicant),
          applicant.documentNumber,
        );
        entries.push({
          filename: createInvitationReasonPdfFilename(applicant),
          blob: await exportInvitationPdf(canvas),
        });
      }
      setRenderMessage('ZIPファイルを作成しています...');
      downloadBlob(await createZipBlob(entries), 'InvitationReason_AllApplicants.zip');
      setRenderMessage(`${entries.length}名分の招へい理由書をZIPで作成しました。`);
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('全員分の招へい理由書作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadAllGuaranteeLettersZip() {
    const common = excelResult ? completeCommonInfo(excelResult.common) : null;
    if (!excelResult || !common || !excelResult.canGenerateBatch || excelResult.applicants.length === 0) return;
    setIsRendering(true);
    setRenderError(null);
    try {
      const entries: { filename: string; blob: Blob }[] = [];
      for (const [index, applicant] of excelResult.applicants.entries()) {
        setRenderMessage(
          `全員分の身元保証書を作成しています... ${index + 1}/${excelResult.applicants.length} ${applicant.passportName}`,
        );
        const canvas = await renderGuaranteeCanvas(
          toGuaranteeLetterData(common, applicant, guaranteeSettings),
        );
        entries.push({
          filename: createGuaranteeLetterPdfFilename(applicant),
          blob: await exportInvitationPdf(canvas),
        });
      }
      downloadBlob(await createZipBlob(entries), 'GuaranteeLetter_AllApplicants.zip');
      setRenderMessage(`${entries.length}名分の身元保証書をZIPで作成しました。`);
    } catch (caughtError) {
      console.error(caughtError);
      setRenderError(toJapaneseRenderError(caughtError));
      setRenderMessage('全員分の身元保証書作成に失敗しました。');
    } finally {
      setIsRendering(false);
    }
  }

  async function downloadExcelTemplate() {
    const XLSX = await loadXlsx();
    XLSX.writeFile(createBatchWorkbook(XLSX), batchTemplateFilename);
  }

  async function handleExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await loadXlsx();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const result = parseBatchWorkbook(XLSX, workbook, file.name);
      setExcelResult(result);
      setSelectedSequence(result.applicants[0]?.sequence ?? null);
      setUploadedAt(formatJapanDateTime(new Date()));
      setSidebarTab('applicant');
    } catch (caughtError) {
      setExcelResult({
        fileName: file.name,
        common: {},
        reviewApplicants: [],
        applicants: [],
        loadedApplicantRows: 0,
        validApplicantCount: 0,
        canGenerateBatch: false,
        issues: [{
          level: 'error',
          scope: 'common',
          field: 'file',
          message: caughtError instanceof Error
            ? caughtError.message
            : 'Excelファイルの読み込みに失敗しました。',
        }],
      });
      setSelectedSequence(null);
      setUploadedAt(formatJapanDateTime(new Date()));
    }
    event.target.value = '';
  }

  const selected = getSelectedUploadedData();
  const selectedApplicant = selected?.applicant ?? null;
  const selectedReady = selected !== null;
  const batchReady = Boolean(excelResult?.canGenerateBatch && excelResult.applicants.length);
  const currentDocumentDate = selected?.common.documentDate ?? fixedGuaranteeLetterSample.documentDate;
  const currentMission = selected?.common.diplomaticMission ?? fixedGuaranteeLetterSample.diplomaticMission;
  const applicantLabel = selectedApplicant
    ? `${String(selectedApplicant.sequence).padStart(2, '0')} ${selectedApplicant.passportName}`
    : 'サンプルデータ';

  function confirmBatch(kind: 'invitation' | 'guarantee') {
    if (!excelResult) return false;
    const documentLabel = kind === 'invitation' ? '招へい理由書' : '身元保証書';
    return window.confirm(
      `${excelResult.applicants.length}名分の${documentLabel}を作成します。\n\n`
      + `作成日：${currentDocumentDate}\n`
      + `提出先公館：${currentMission}\n`
      + `エラー：${excelResult.issues.filter((issue) => issue.level === 'error').length}件\n\n`
      + '内容を確認して「OK」を押してください。',
    );
  }

  return (
    <>
      <header className="appHeader">
        <div className="brandBlock">
          <span className="brandEyebrow">留学サポートデスク</span>
          <h1>短期滞在ビザ書類作成</h1>
        </div>
        <div className="headerMeta">
          <time dateTime={new Date().toISOString()}>{japanTime}</time>
          <div className="headerBadges">
            <span>学内業務用</span>
            <span className="privacyBadge">個人情報取扱注意</span>
          </div>
        </div>
      </header>

      <main className="appShell">
        <nav className="stepBar" aria-label="作業手順">
          <div className={`stepItem ${excelResult ? 'complete' : 'active'}`}>
            <span>1</span><strong>Excel取込</strong>
          </div>
          <div className={`stepConnector ${excelResult ? 'complete' : ''}`} />
          <div className={`stepItem ${!excelResult ? 'pending' : selectedReady ? 'complete' : 'active'}`}>
            <span>2</span><strong>内容確認</strong>
          </div>
          <div className={`stepConnector ${selectedReady ? 'complete' : ''}`} />
          <div className={`stepItem ${selectedReady ? 'active' : 'pending'}`}>
            <span>3</span><strong>書類作成</strong>
          </div>
        </nav>

        <details className="aboutPanel">
          <summary>このツールについて</summary>
          <div>
            <p>
              短期滞在ビザが必要な留学生に対して、ビザ申請関連書類を作成する学内業務用ツールです。
              指定のExcelテンプレートから申請人情報を読み込み、内容を確認して申請人ごとのPDFを作成します。
            </p>
            <p><strong>現在対応している書類：</strong>招へい理由書・身元保証書</p>
            <p>作成した書類は、提出前に必ず担当職員が内容を確認してください。</p>
          </div>
        </details>

        <div className="workspaceGrid">
          <aside className="sidebar" aria-label="入力・申請人情報">
            <section className="panel uploadPanel">
              <div className="panelHeading">
                <span className="panelStep">STEP 1</span>
                <h2>Excelを読み込む</h2>
              </div>
              <p className="panelHelp">入力済みExcelをアップロードしてください。初回はテンプレートをダウンロードします。</p>
              <div className="uploadActions">
                <label className="uploadButton">
                  {excelResult ? '別のExcelを読み込む' : 'Excelをアップロード'}
                  <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
                </label>
                <button type="button" className="secondaryButton" onClick={downloadExcelTemplate}>
                  テンプレート
                </button>
              </div>
              {excelResult ? (
                <div className="fileMeta">
                  <strong>{excelResult.fileName}</strong>
                  <span>読込日時：{uploadedAt ?? '取得中'}</span>
                </div>
              ) : null}
            </section>

            {excelResult ? (
              <section className="panel applicantPanel">
                <div className="panelHeading">
                  <span className="panelStep">STEP 2</span>
                  <h2>申請人を確認</h2>
                </div>
                <ApplicantList
                  result={excelResult}
                  selectedSequence={selectedSequence}
                  onSelectApplicant={(applicant) => setSelectedSequence(applicant.sequence)}
                />
              </section>
            ) : (
              <section className="panel emptyGuide">
                <strong>最初にExcelを読み込んでください</strong>
                <p>読込前は右側に確認用のサンプル書類を表示しています。</p>
              </section>
            )}

            <section className="panel detailPanel">
              <div className="sidebarTabs" role="tablist" aria-label="詳細情報">
                <button
                  type="button"
                  className={sidebarTab === 'applicant' ? 'active' : ''}
                  onClick={() => setSidebarTab('applicant')}
                >
                  申請人情報
                </button>
                <button
                  type="button"
                  className={sidebarTab === 'document' ? 'active' : ''}
                  onClick={() => setSidebarTab('document')}
                >
                  書類設定
                </button>
                <button
                  type="button"
                  className={sidebarTab === 'guarantor' ? 'active' : ''}
                  onClick={() => setSidebarTab('guarantor')}
                >
                  保証人情報
                </button>
              </div>

              {sidebarTab === 'applicant' ? (
                <dl className="readOnlyList">
                  <ReadOnlyField label="氏名" value={selectedApplicant?.passportName ?? fixedGuaranteeLetterSample.applicantPassportName} />
                  <ReadOnlyField label="国籍" value={selectedApplicant?.nationality ?? fixedGuaranteeLetterSample.applicantNationality} />
                  <ReadOnlyField label="職業" value={selectedApplicant?.occupation ?? fixedGuaranteeLetterSample.applicantOccupation} />
                  <ReadOnlyField label="性別" value={selectedApplicant?.gender ?? fixedGuaranteeLetterSample.applicantGender} />
                  <ReadOnlyField label="生年月日" value={selectedApplicant?.dateOfBirth ?? fixedGuaranteeLetterSample.applicantDateOfBirth} />
                  <ReadOnlyField label="年齢" value={selectedApplicant?.calculatedAge ?? fixedGuaranteeLetterSample.applicantAge} />
                </dl>
              ) : null}

              {sidebarTab === 'document' ? (
                <dl className="readOnlyList">
                  <ReadOnlyField label="書類作成日" value={currentDocumentDate} />
                  <ReadOnlyField label="提出先公館" value={currentMission} />
                  <ReadOnlyField label="招へい理由書番号" value={selectedApplicant?.documentNumber ?? 'サンプル'} />
                  <ReadOnlyField label="身元保証書番号" value={selectedApplicant?.guaranteeDocumentNumber ?? 'サンプル'} />
                  <ReadOnlyField label="プログラム名" value={selected?.common.programName ?? 'サンプルプログラム'} />
                </dl>
              ) : null}

              {sidebarTab === 'guarantor' ? (
                <div className="formStack">
                  <label>
                    所属・肩書・氏名
                    <input
                      value={guaranteeSettings.guarantorName}
                      onChange={(event) => setGuaranteeSettings((current) => ({
                        ...current,
                        guarantorName: event.target.value,
                      }))}
                    />
                  </label>
                  <label>
                    職業（任意）
                    <input
                      value={guaranteeSettings.guarantorOccupation}
                      onChange={(event) => setGuaranteeSettings((current) => ({
                        ...current,
                        guarantorOccupation: event.target.value,
                      }))}
                    />
                  </label>
                  <label>
                    生年月日
                    <input
                      type="date"
                      value={guaranteeSettings.guarantorDateOfBirth}
                      onChange={(event) => setGuaranteeSettings((current) => ({
                        ...current,
                        guarantorDateOfBirth: event.target.value,
                      }))}
                    />
                  </label>
                  <label>
                    公館種別
                    <select
                      value={guaranteeSettings.missionType}
                      onChange={(event) => setGuaranteeSettings((current) => ({
                        ...current,
                        missionType: event.target.value as MissionType,
                      }))}
                    >
                      <option value="none">未選択</option>
                      <option value="embassy">大使館</option>
                      <option value="consulate">総領事館</option>
                    </select>
                  </label>
                  <label>
                    保証人FAX（任意）
                    <input
                      value={guaranteeSettings.guarantorFax}
                      onChange={(event) => setGuaranteeSettings((current) => ({
                        ...current,
                        guarantorFax: event.target.value,
                      }))}
                    />
                  </label>
                  <label>
                    担当者FAX（任意）
                    <input
                      value={guaranteeSettings.contactFax}
                      onChange={(event) => setGuaranteeSettings((current) => ({
                        ...current,
                        contactFax: event.target.value,
                      }))}
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </aside>

          <section className="previewWorkspace" aria-label="書類プレビュー">
            <div className={`dataBanner ${selectedReady ? 'uploaded' : 'sample'}`}>
              <div>
                <strong>{selectedReady ? 'Excelデータ表示中' : 'サンプルデータ表示中'}</strong>
                <span>
                  {selectedReady
                    ? `選択中：${applicantLabel}`
                    : '確認用データです。実際の書類として使用しないでください。'}
                </span>
              </div>
              <small>{excelResult ? `データ元：${excelResult.fileName}` : 'Excel未読込'}</small>
            </div>

            <div className="previewHeader">
              <div>
                <span className="panelStep">STEP 3</span>
                <h2>書類を確認する</h2>
              </div>
              <div className="previewTabs" role="tablist" aria-label="プレビュー書類切替">
                <button
                  type="button"
                  className={previewMode === 'invitation' ? 'active' : ''}
                  onClick={() => setPreviewMode('invitation')}
                >
                  招へい理由書
                </button>
                <button
                  type="button"
                  className={previewMode === 'guarantee' ? 'active' : ''}
                  onClick={() => setPreviewMode('guarantee')}
                >
                  身元保証書
                </button>
                <button
                  type="button"
                  className={previewMode === 'both' ? 'active' : ''}
                  onClick={() => setPreviewMode('both')}
                >
                  2書類確認
                </button>
              </div>
            </div>

            <div className={`previewStage ${previewMode === 'both' ? 'bothMode' : ''}`}>
              <article className={`previewDocument ${previewMode === 'guarantee' ? 'hiddenDocument' : ''}`}>
                <div className="documentTitleRow">
                  <h3>招へい理由書</h3>
                  <span>{applicantLabel}</span>
                </div>
                <div className="canvasFrame">
                  <canvas
                    ref={previewCanvasRef}
                    width={2481}
                    height={3508}
                    aria-label="招へい理由書Canvasプレビュー"
                  />
                </div>
              </article>

              <article className={`previewDocument ${previewMode === 'invitation' ? 'hiddenDocument' : ''}`}>
                <div className="documentTitleRow">
                  <h3>身元保証書</h3>
                  <span>{applicantLabel}</span>
                </div>
                <div className="canvasFrame">
                  <canvas
                    ref={guaranteeCanvasRef}
                    width={GUARANTEE_CANVAS_WIDTH}
                    height={GUARANTEE_CANVAS_HEIGHT}
                    aria-label="身元保証書Canvasプレビュー"
                  />
                </div>
              </article>
            </div>

            <div className="statusPanel" aria-live="polite">
              <div>
                <strong>処理状況</strong>
                <span>{renderMessage}</span>
              </div>
              {renderError ? <p className="errorMessage">{renderError}</p> : null}
              {(previewMode === 'guarantee' || previewMode === 'both') ? (
                <div className="guaranteeStatus">
                  <strong>身元保証書</strong>
                  <span>{guaranteePreviewMessage}</span>
                  {guaranteePreviewError ? <p className="errorMessage">{guaranteePreviewError}</p> : null}
                </div>
              ) : null}
            </div>

            <details className="advancedPanel">
              <summary>詳細機能・確認用出力</summary>
              <div className="advancedActions">
                <button type="button" className="secondaryButton" onClick={() => regeneratePreview(isDebug)} disabled={isRendering}>
                  プレビューを再生成
                </button>
                <button type="button" className="secondaryButton" onClick={downloadCompletedPng} disabled={isRendering}>
                  確認用PNG
                </button>
                <button type="button" className="secondaryButton" onClick={downloadCompletedPdf} disabled={isRendering}>
                  固定サンプルPDF
                </button>
              </div>
            </details>
          </section>
        </div>
      </main>

      <footer className="actionBar" aria-label="書類出力">
        <div className="actionBarInner">
          <div className="actionContext">
            <strong>{selectedReady ? `選択中：${applicantLabel}` : 'Excelを読み込んで申請人を選択してください'}</strong>
            <span>{isRendering ? '処理中です。完了まで画面を閉じないでください。' : renderMessage}</span>
          </div>
          <div className="actionButtons">
            <button type="button" className="secondaryButton" onClick={downloadSelectedApplicantPdf} disabled={isRendering || !selectedReady}>
              招へい理由書PDF
            </button>
            <button type="button" className="secondaryButton" onClick={downloadSelectedGuaranteePdf} disabled={isRendering || !selectedReady}>
              身元保証書PDF
            </button>
            <button type="button" className="primaryButton" onClick={downloadSelectedDocumentSet} disabled={isRendering || !selectedReady}>
              2書類をZIP
            </button>
            <button
              type="button"
              className="batchButton"
              disabled={isRendering || !batchReady}
              onClick={() => {
                if (confirmBatch('invitation')) void downloadAllApplicantsZip();
              }}
            >
              全員の招へい理由書ZIP
            </button>
            <button
              type="button"
              className="batchButton"
              disabled={isRendering || !batchReady}
              onClick={() => {
                if (confirmBatch('guarantee')) void downloadAllGuaranteeLettersZip();
              }}
            >
              全員の身元保証書ZIP
            </button>
          </div>
        </div>
      </footer>
    </>
  );
}
