import type { BatchParseResult } from '../domain/batchApplicant';
import type { GuaranteeLetterSettings } from '../domain/guaranteeLetterData';

export type RuntimeVisaSnapshot = {
  batchResult: BatchParseResult | null;
  guaranteeSettings: GuaranteeLetterSettings | null;
};

type Listener = () => void;

let snapshot: RuntimeVisaSnapshot = {
  batchResult: null,
  guaranteeSettings: null,
};

const listeners = new Set<Listener>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function getRuntimeVisaSnapshot() {
  return snapshot;
}

export function subscribeRuntimeVisaStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setRuntimeBatchResult(batchResult: BatchParseResult) {
  snapshot = { ...snapshot, batchResult };
  emitChange();
}

export function clearRuntimeBatchResult() {
  if (!snapshot.batchResult) return;
  snapshot = { ...snapshot, batchResult: null };
  emitChange();
}

export function setRuntimeGuaranteeSettings(guaranteeSettings: GuaranteeLetterSettings) {
  snapshot = {
    ...snapshot,
    guaranteeSettings: { ...guaranteeSettings },
  };
  emitChange();
}
