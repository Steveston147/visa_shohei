# Security and privacy

This application handles personal information used to prepare Japanese visa documents.

## Data processing model

- Excel parsing, validation, preview rendering, PDF creation, and ZIP creation run in the user's browser.
- The application does not include an API for uploading or storing applicant data on a server.
- Applicant data is held in browser memory for the current session. Reloading or closing the page clears the in-memory state.
- Generated Excel, PDF, PNG, and ZIP files are downloaded to the user's device and must be managed under the organisation's information-handling rules.

## Production requirements

- Use the application only on an organisation-managed device.
- Do not use the application on a shared or public computer.
- Keep the production URL out of search engines. The application sends `noindex` and related headers, but this is not a substitute for access control.
- Restrict the production deployment using the organisation's approved access-control method or Vercel deployment protection.
- Do not place real applicant data, completed Excel files, generated PDFs, or ZIP archives in the Git repository.
- Review generated documents before submission. The application does not guarantee approval of a visa application.

## Reporting a problem

Stop using the production deployment if applicant data appears in logs, network requests, analytics, error-reporting services, or server-side storage. Record the steps that caused the issue and report it to the repository owner before resuming use.
