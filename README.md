# 招へい理由書PDF作成

Next.js + TypeScript app that fills one Japanese visa invitation reason PDF (`招へい理由書`) with fixed sample data and downloads a flattened PDF.

## Template and field names

Place the fillable PDF template at:

```text
public/templates/shouhei-riyusho.pdf
```

PDF field names must be maintained in:

```text
src/lib/pdfFieldNames.ts
```

This file is the single source of truth for PDF field names. Do not hard-code guessed field names in other files. If a required field name is blank or does not exist in the template, the app shows a clear error message.

## Japanese font

The sample data contains Japanese text. To render Japanese text correctly with `pdf-lib`, place a Japanese-capable TrueType font at:

```text
public/fonts/NotoSansJP-Regular.ttf
```

The app uses the pdf-lib recommended `@pdf-lib/fontkit` package. It does not include or download font files automatically. If this file is missing, PDF generation stops with an instruction to add it.

## Run the app

```bash
npm install
npm run dev
```

Open the URL printed by Next.js and click `完成PDFをダウンロード`.

The downloaded file name is:

```text
InvitationReason_{programName}_{passportName}.pdf
```

## Inspect PDF field names

```bash
npm run inspect:pdf
```

The script reads `public/templates/shouhei-riyusho.pdf`, prints every AcroForm widget with page index and rectangle coordinates, sorts widgets top-to-bottom and left-to-right, and writes `docs/pdf-field-inspection.md`. Use the coordinate report plus the visible PDF layout to update `src/lib/pdfFieldNames.ts`; do not rely on field order alone.

## Scope

This app intentionally supports exactly one visa applicant. It does not implement multiple applicants, representative applicant mode, applicant lists, ZIP export, Excel import, login, database, or cloud storage.
