# Implementation status

Implemented on `feature/guarantee-letter`:

- guarantee letter data model
- optional mission type (none / embassy / consulate)
- optional guarantor occupation and fax fields
- guarantor organisation, title and name in one field
- guarantor date of birth with automatic age calculation
- one applicant per guarantee letter
- guarantee letter Canvas renderer
- selected applicant PDF export
- selected applicant two-document ZIP export
- all-applicant guarantee letter ZIP export, with one PDF per applicant
- validation script and operating documentation

Before merging for production use:

- run `npm install`
- run `npm run typecheck`
- run `npm run validate:batch`
- run `npm run validate:guarantee`
- run `npm run build`
- visually compare a generated PDF with the official guarantee letter form and adjust coordinates if needed
