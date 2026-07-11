'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { BatchApplicant, CommonInfo } from '../domain/batchApplicant';
import { requiredCommonKeys } from '../domain/batchApplicant';
import { createInvitationReasonPdfFilename, toInvitationReasonData } from '../domain/batchInvitationMapping';
import {
  createGuaranteeLetterPdfFilename,
  defaultGuaranteeLetterSettings,
  toGuaranteeLetterData,
} from '../domain/guaranteeLetterData';
import { createZipBlob, type ZipEntry } from '../lib/zip';
import {
  clearRuntimeBatchResult,
  getRuntimeVisaSnapshot,
  subscribeRuntimeVisaStore,
  type RuntimeVisaSnapshot,
} from '../lib/runtimeVisaStore';
import { drawDocumentNumber } from '../pdf/drawDocumentNumber';
import { exportInvitationPdf } from '../pdf/exportInvitationPdf';
import { renderGuaranteeCanvas } from '../pdf/renderGuaranteeCanvas';
import { renderInvitationCanvas } from '../pdf/renderInvitationCanvas';

const EMPTY_SNAPSHOT: RuntimeVisaSnapshot = {
  batchResult: null,
  guaranteeSettings: null,
};

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

function safeFolderName(applicant: BatchApplicant) {
  const safeName = applicant.passportName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${String(applicant.sequence).padStart(2, '0')}_${safeName || 'Applicant'}`;
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

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 1;
  canvas.height = 1;
}

async function createApplicantEntries(
  common: CommonInfo,
  applicant: BatchApplicant,
  settings: NonNullable<RuntimeVisaSnapshot['guaranteeSettings']>,
): Promise<ZipEntry[]> {
  const folder = safeFolderName(applicant);

  const invitationCanvas = await renderInvitationCanvas(
    toInvitationReasonData(common, applicant),
    { debug: false },
  );
  drawDocumentNumber(invitationCanvas, applicant.documentNumber);
  const invitationBlob = await exportInvitationPdf(invitationCanvas);
  releaseCanvas(invitationCanvas);

  const guaranteeCanvas = await renderGuaranteeCanvas(
    toGuaranteeLetterData(common, applicant, settings),
  );
  const guaranteeBlob = await exportInvitationPdf(guaranteeCanvas);
  releaseCanvas(guaranteeCanvas);

  return [
    {
      filename: `${folder}/${createInvitationReasonPdfFilename(applicant)}`,
      blob: invitationBlob,
    },
    {
      filename: `${folder}/${createGuaranteeLetterPdfFilename(applicant)}`,
      blob: guaranteeBlob,
    },
  ];
}

export default function AllDocumentsBatchButton() {
  const snapshot = useSyncExternalStore(
    subscribeRuntimeVisaStore,
    getRuntimeVisaSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [pageBusy, setPageBusy] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [buttonLabel, setButtonLabel] = useState('全員の全書類ZIP');

  useEffect(() => {
    const refreshTargetAndBusyState = () => {
      const target = document.querySelector<HTMLElement>('.actionButtons');
      setPortalTarget(target);
      const existingBatchButtons = target
        ? Array.from(target.querySelectorAll<HTMLButtonElement>('.batchButton'))
        : [];
      setPageBusy(existingBatchButtons.some((button) => button.disabled));
    };

    refreshTargetAndBusyState();
    const observer = new MutationObserver(refreshTargetAndBusyState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['disabled'],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const clearBeforeNewUpload = (event: Event) => {
      const input = event.target;
      if (
        input instanceof HTMLInputElement
        && input.type === 'file'
        && input.accept.includes('.xlsx')
      ) {
        clearRuntimeBatchResult();
      }
    };
    document.addEventListener('change', clearBeforeNewUpload, true);
    return () => document.removeEventListener('change', clearBeforeNewUpload, true);
  }, []);

  const batchResult = snapshot.batchResult;
  const canCreate = Boolean(
    batchResult?.canGenerateBatch
    && batchResult.applicants.length > 0
    && completeCommonInfo(batchResult.common),
  );

  async function downloadAllDocuments() {
    if (!batchResult || !canCreate || isCreating) return;
    const common = completeCommonInfo(batchResult.common);
    if (!common) return;

    const count = batchResult.applicants.length;
    const confirmed = window.confirm(
      `${count}名分、合計${count * 2}通の書類を作成します。\n\n`
      + '・招へい理由書\n'
      + '・身元保証書\n\n'
      + 'ZIP内は申請人ごとのフォルダに整理されます。\n'
      + `作成日：${common.documentDate}\n`
      + `提出先公館：${common.diplomaticMission}\n`
      + 'エラー：0件\n\n'
      + '内容を確認して「OK」を押してください。',
    );
    if (!confirmed) return;

    setIsCreating(true);
    const settings = snapshot.guaranteeSettings ?? defaultGuaranteeLetterSettings;

    try {
      const entries: ZipEntry[] = [];
      for (const [index, applicant] of batchResult.applicants.entries()) {
        setButtonLabel(`作成中 ${index + 1}/${count}`);
        try {
          const applicantEntries = await createApplicantEntries(common, applicant, settings);
          entries.push(...applicantEntries);
        } catch (error) {
          const reason = error instanceof Error ? error.message : '不明なエラー';
          throw new Error(`${String(applicant.sequence).padStart(2, '0')} ${applicant.passportName} の作成中に失敗しました。${reason}`);
        }
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      }

      setButtonLabel('ZIP作成中...');
      const zip = await createZipBlob(entries);
      downloadBlob(zip, 'VisaDocuments_AllApplicants.zip');
      setButtonLabel(`${count}名・${entries.length}通 完了`);
      window.setTimeout(() => setButtonLabel('全員の全書類ZIP'), 4000);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました。';
      setButtonLabel('作成に失敗しました');
      window.alert(`全員分の全書類を作成できませんでした。\n\n${message}`);
      window.setTimeout(() => setButtonLabel('全員の全書類ZIP'), 5000);
    } finally {
      setIsCreating(false);
    }
  }

  if (!portalTarget) return null;

  return createPortal(
    <button
      type="button"
      className="primaryButton"
      disabled={!canCreate || isCreating || pageBusy}
      onClick={() => void downloadAllDocuments()}
      title="全申請人の招へい理由書と身元保証書を、申請人別フォルダにまとめてダウンロードします"
    >
      {buttonLabel}
    </button>,
    portalTarget,
  );
}
