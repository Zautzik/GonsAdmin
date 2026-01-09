import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react';
import OTPDFDocument from './OTPDFDocument';

export default function OTPDFPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: workOrder } = await supabase.from('work_orders').select('*').eq('id', id).single();
    const { data: specifications } = await supabase.from('ot_specifications').select('*').eq('work_order_id', id).single();
    const { data: calculations } = await supabase.from('ot_calculations').select('*').eq('work_order_id', id).single();
    const { data: operations } = await supabase.from('ot_operations').select('*').eq('work_order_id', id).order('sequence_order');
    const { data: pricing } = await supabase.from('ot_pricing').select('*').eq('work_order_id', id).single();

    setData({ workOrder, specifications, calculations, operations: operations || [], pricing });
    setLoading(false);

    // Generate PDF
    if (workOrder) {
      generatePDF({ workOrder, specifications, calculations, operations: operations || [], pricing });
    }
  };

  const generatePDF = async (pdfData: any) => {
    setGenerating(true);
    try {
      const blob = await pdf(<OTPDFDocument {...pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    setGenerating(false);
  };

  const handleDownload = () => {
    if (pdfUrl && data?.workOrder) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `OT-${data.workOrder.ot_number}.pdf`;
      link.click();
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/ots/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">PDF OT #{data?.workOrder?.ot_number}</h1>
            <p className="text-muted-foreground">{data?.workOrder?.client_name} • {data?.workOrder?.product_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={!pdfUrl} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleDownload} disabled={!pdfUrl} className="gap-2">
            <Download className="h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </div>

      {/* PDF Preview */}
      <Card>
        <CardContent className="p-0">
          {generating ? (
            <div className="flex items-center justify-center h-[800px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Generando PDF...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[800px] border-0 rounded-lg"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[800px] text-muted-foreground">
              No se pudo generar el PDF
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}