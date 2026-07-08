/**
 * export-utils - Utilitários compartilhados de exportação (Excel/PDF).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Centraliza a lógica de exportação para PDF (jsPDF + autotable) e Excel (xlsx),
 * evitando duplicação entre páginas (Membros, Indicações, Negócios, Convidados).
 */

const todayStamp = () => new Date().toISOString().split('T')[0];

export interface ExportColumn<T> {
  header: string;
  /** Função que extrai o valor (já formatado como string) da linha. */
  value: (row: T) => string | number | null | undefined;
}

/**
 * Exporta uma lista de linhas para um arquivo .xlsx.
 */
export async function exportRowsToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  options: { fileName: string; sheetName?: string }
): Promise<void> {
  const XLSX = await import('xlsx');

  const data = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    columns.forEach((col) => {
      const v = col.value(row);
      obj[col.header] = v === null || v === undefined ? '' : v;
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Dados');

  // Auto-size das colunas
  ws['!cols'] = columns.map((col) => ({
    wch: Math.max(
      col.header.length,
      ...data.map((row) => String(row[col.header] ?? '').length)
    ),
  }));

  XLSX.writeFile(wb, `${options.fileName}-${todayStamp()}.xlsx`);
}

/**
 * Exporta uma lista de linhas para um arquivo .pdf (tabela).
 */
export async function exportRowsToPDF<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  options: { fileName: string; title: string; subtitle?: string }
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(options.title, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Exportado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  if (options.subtitle) doc.text(options.subtitle, 14, 36);
  doc.text(`Total: ${rows.length} registros`, 14, options.subtitle ? 42 : 36);

  const body = rows.map((row) =>
    columns.map((col) => {
      const v = col.value(row);
      return v === null || v === undefined ? '-' : String(v);
    })
  );

  autoTable(doc, {
    startY: options.subtitle ? 48 : 42,
    head: [columns.map((c) => c.header)],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 95] }, // Navy Blue da marca
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${options.fileName}-${todayStamp()}.pdf`);
}
