/**
 * ExportButton - Botão reutilizável de exportação (Excel/PDF).
 *
 * @author Diogo Devitte
 * @company Ranktop SEO Inteligente
 * @website https://ranktop.com.br
 * @contact (51) 991227114
 *
 * © 2026 Ranktop SEO Inteligente. Todos os direitos reservados.
 *
 * Encapsula o dropdown de exportação usando os utilitários centralizados em
 * `src/lib/export-utils.ts`. Reaproveitado por Indicações, Negócios e afins,
 * mantendo consistência visual (identidade Navy/Orange) sem duplicar lógica.
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  exportRowsToExcel,
  exportRowsToPDF,
  type ExportColumn,
} from '@/lib/export-utils';

interface ExportButtonProps<T> {
  rows: T[];
  columns: ExportColumn<T>[];
  fileName: string;
  title: string;
  subtitle?: string;
  sheetName?: string;
  label?: string;
  disabled?: boolean;
}

export default function ExportButton<T>({
  rows,
  columns,
  fileName,
  title,
  subtitle,
  sheetName,
  label = 'Exportar',
  disabled,
}: ExportButtonProps<T>) {
  const { toast } = useToast();

  const handleExcel = async () => {
    if (!rows.length) {
      toast({ title: 'Nada para exportar', description: 'Não há registros disponíveis.' });
      return;
    }
    try {
      await exportRowsToExcel(rows, columns, { fileName, sheetName });
      toast({ title: 'Exportado!', description: 'Arquivo Excel gerado com sucesso.' });
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
      toast({ title: 'Erro', description: 'Falha ao exportar para Excel.', variant: 'destructive' });
    }
  };

  const handlePDF = async () => {
    if (!rows.length) {
      toast({ title: 'Nada para exportar', description: 'Não há registros disponíveis.' });
      return;
    }
    try {
      await exportRowsToPDF(rows, columns, { fileName, title, subtitle });
      toast({ title: 'Exportado!', description: 'Arquivo PDF gerado com sucesso.' });
    } catch (e) {
      console.error('Erro ao exportar PDF:', e);
      toast({ title: 'Erro', description: 'Falha ao exportar para PDF.', variant: 'destructive' });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar para Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar para PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
