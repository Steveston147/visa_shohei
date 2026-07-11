# 招へい理由書・身元保証書PDF作成

Next.js + TypeScript app that creates Japanese visa invitation documents from Excel applicant data.

## Supported documents

- 招へい理由書
- 身元保証書（申請人1名につき1通）

The same applicant data can be used to download each PDF separately, both documents for one applicant in a ZIP file, separate all-applicant ZIP files, or all documents arranged in applicant folders.

## 身元保証書の運用

- 身元保証人氏名欄には、所属・肩書・氏名をまとめて入力できます。
- 身元保証人の職業は任意です。
- 身元保証人の生年月日を入力すると、書類作成日現在の年齢を自動計算します。
- 公館種別は「未選択」「大使館」「総領事館」から選択できます。
- 未選択のまま出力し、提出時に手書きでチェックする運用にも対応します。
- 複数申請人を1枚にまとめず、常に1名につき1通を発行します。

## Privacy model

- Excel読込、入力検証、プレビュー、PDF作成、ZIP作成はブラウザ内で実行します。
- 申請人情報をアップロードまたは保存するサーバーAPIはありません。
- 読み込んだデータはページの再読み込みまたはブラウザ終了でメモリから消えます。
- ダウンロードしたExcel、PDF、PNG、ZIPは利用者の端末に保存されるため、組織の個人情報取扱ルールに従って管理してください。
- 本番環境では検索除外に加えて、組織で承認されたアクセス制御またはVercel Deployment Protectionを設定してください。

See [SECURITY.md](SECURITY.md) for the production security requirements.

## Japanese font

Place a Japanese-capable TrueType font at:

```text
public/fonts/NotoSansJP-Regular.ttf
```

## Run the app

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run validate:guarantee-background
npm run validate:batch
npm run validate:guarantee
npm run typecheck
npm run build
```

## Excel input

The app can download an Excel template, upload an edited workbook, validate applicant rows, preserve invalid rows for review, preview a selected applicant, and create individual PDFs or ZIP archives.

## Output

- Selected applicant invitation reason PDF
- Selected applicant guarantee letter PDF
- Both documents for the selected applicant in one ZIP
- Invitation reason PDFs for all valid applicants in one ZIP
- One guarantee letter per applicant for all valid applicants in one ZIP
- Both documents for every valid applicant, arranged in applicant folders, in one ZIP

## Production acceptance

Complete [docs/production-acceptance-test.md](docs/production-acceptance-test.md) before operational use. In particular, both document types must be printed at A4 / 100% and visually checked against an actual submitted sample.

## Notes

The documents are rendered on Canvas and converted to A4 PDF with `pdf-lib`. Coordinates must be visually checked against an actual submitted sample before production use. Generated documents must always be reviewed by the responsible staff member before submission.
