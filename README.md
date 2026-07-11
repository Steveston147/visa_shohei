# 招へい理由書・身元保証書PDF作成

Next.js + TypeScript app that creates Japanese visa invitation documents from Excel applicant data.

## Supported documents

- 招へい理由書
- 身元保証書（申請人1名につき1通）

The same applicant data can be used to download each PDF separately or both documents in one ZIP file.

## 身元保証書の運用

- 身元保証人氏名欄には、所属・肩書・氏名をまとめて入力できます。
- 身元保証人の職業は任意です。
- 身元保証人の生年月日を入力すると、書類作成日現在の年齢を自動計算します。
- 公館種別は「未選択」「大使館」「総領事館」から選択できます。
- 未選択のまま出力し、提出時に手書きでチェックする運用にも対応します。
- 複数申請人を1枚にまとめず、常に1名につき1通を発行します。

## Japanese font

Place a Japanese-capable TrueType font at:

```text
public/fonts/NotoSansJP-Regular.ttf
```

## Run the app

```bash
npm install
npm run dev
```

## Validation

```bash
npm run typecheck
npm run validate:batch
npm run validate:guarantee
npm run build
```

## Excel input

The app can download an Excel template, upload an edited workbook, validate applicant rows, preview a selected applicant, and create individual PDFs or ZIP archives.

## Output

- Selected applicant invitation reason PDF
- Selected applicant guarantee letter PDF
- Both documents for the selected applicant in one ZIP
- Invitation reason PDFs for all valid applicants in one ZIP
- One guarantee letter per applicant for all valid applicants in one ZIP

## Notes

The guarantee letter is rendered on Canvas and converted to A4 PDF with the existing `pdf-lib` export pipeline. Its coordinates should be visually checked against an actual submitted sample before production use.
