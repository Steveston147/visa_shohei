'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';

const templatePath = '/templates/shouhei-riyusho.pdf';

export default function Home() {
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [message, setMessage] = useState('まだ確認していません。');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function inspectPdfFields() {
    setIsLoading(true);
    setError(null);
    setFieldNames([]);
    setMessage('PDFを読み込んでいます...');

    try {
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`PDFテンプレートを読み込めませんでした: ${response.status} ${response.statusText}`);
      }

      const bytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const fields = pdfDoc.getForm().getFields();
      const names = fields.map((field) => field.getName());

      console.log('AcroForm field names:', names);
      setFieldNames(names);
      setMessage(
        names.length > 0
          ? `${names.length}件のAcroFormフィールドが見つかりました。`
          : 'AcroFormフィールドは見つかりませんでした。',
      );
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : '不明なエラーが発生しました。';
      console.error(errorMessage);
      setError(errorMessage);
      setMessage('確認に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <h1>招へい理由書 PDFフィールド確認</h1>
      <p>PDFテンプレートのAcroFormフィールド名だけを確認します。</p>
      <button type="button" onClick={inspectPdfFields} disabled={isLoading}>
        PDFフィールド名を確認
      </button>

      <section className="result" aria-live="polite">
        <h2>確認結果</h2>
        <p>{message}</p>
        {error ? <p className="error">{error}</p> : null}
        {fieldNames.length > 0 ? (
          <ol>
            {fieldNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ol>
        ) : null}
      </section>
    </main>
  );
}
