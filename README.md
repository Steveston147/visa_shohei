# 招へい理由書 PDFフィールド確認

Minimal Next.js + TypeScript app for inspecting AcroForm field names in a Japanese visa invitation reason PDF template (`招へい理由書`).

This step only inspects PDF field names. It does **not** generate completed PDFs, import Excel files, or draw text by coordinates.

## PDF template location

Place the PDF template here:

```text
public/templates/shouhei-riyusho.pdf
```

The app and the Node.js inspection script both read this exact path.

## Run the app

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open the URL printed by Next.js, then click:

```text
PDFフィールド名を確認
```

The page will list all AcroForm field names found in `public/templates/shouhei-riyusho.pdf`. The same field names are also printed in the browser console.

## Inspect PDF field names from Node.js

Run:

```bash
npm run inspect:pdf
```

The script loads `public/templates/shouhei-riyusho.pdf` and prints every AcroForm field name.

If fields are found, the script creates or updates:

```text
src/lib/pdfFieldNames.ts
```

That file exports the discovered field names from the actual PDF template so later implementation work can reuse them without guessing.

## If no AcroForm fields are found

If the app or script reports that no AcroForm fields were found, stop this step and confirm the PDF template. Do not guess field names and do not implement coordinate-based drawing in this step.

A PDF with no AcroForm fields may be a flat PDF. In that case, field-based filling with `pdf-lib` is not possible until a fillable PDF template is provided.
