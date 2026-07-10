import type { InvitationReasonData } from './invitationReasonData';
export function validateInvitationReasonData(data: InvitationReasonData): string[] {
  const errors: string[] = [];
  if (data.additionalApplicantsCount !== '') errors.push('追加申請人数は空欄である必要があります。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.documentDate)) errors.push('作成日は YYYY-MM-DD 形式で入力してください。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.applicantDateOfBirth)) errors.push('生年月日は YYYY-MM-DD 形式で入力してください。');
  if (!/^\d{3}-\d{4}$/.test(data.inviterPostalCode)) errors.push('郵便番号は 3桁-4桁で入力してください。');
  return errors;
}
