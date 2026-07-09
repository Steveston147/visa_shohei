declare module 'xlsx' {
  export type WorkSheet = Record<string, any>;
  export type WorkBook = { SheetNames: string[]; Sheets: Record<string, WorkSheet> };

  export const utils: {
    json_to_sheet<T>(data: T[], options?: { header?: string[] }): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
    sheet_to_json<T>(worksheet: WorkSheet, options?: { defval?: unknown; raw?: boolean }): T[];
  };

  export const SSF: {
    parse_date_code(value: number): { y: number; m: number; d: number } | null;
  };

  export function read(data: ArrayBuffer, options?: { type?: string; cellDates?: boolean }): WorkBook;
  export function writeFile(workbook: WorkBook, filename: string): void;
}
