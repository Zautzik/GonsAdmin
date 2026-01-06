import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CostReport = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalCost: 0,
    materialCost: 0,
    laborCost: 0,
    machineCost: 0,
    jobCount: 0,
  });
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetchCostData();
  }, []);

  const fetchCostData = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, ot(ot_number), machines(name), workers(name), batches(paper_type)') as any;

    if (error) {
      toast.error('Error loading cost data');
      return;
    }

    setJobs(data || []);

    const totalCost = data?.reduce((sum, job) => sum + (job.cost || 0), 0) || 0;
    // Mock breakdown (in real app, store separately)
    const materialCost = totalCost * 0.3;
    const laborCost = totalCost * 0.5;
    const machineCost = totalCost * 0.2;

    setStats({
      totalCost,
      materialCost,
      laborCost,
      machineCost,
      jobCount: data?.length || 0,
    });
  };

  const exportToPDF = () => {
    toast.success('PDF export functionality would be implemented here');
    // In production, use jsPDF or similar library
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{t('costReport')}</h2>
        <Button onClick={exportToPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          {t('exportPDF')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t('totalCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${stats.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.jobCount} jobs</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('materialCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${stats.materialCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">30% of total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('laborCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${stats.laborCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">50% of total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('machineCost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${stats.machineCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">20% of total</p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>{t('costBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">OT</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('description')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('machine')}</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('totalCost')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{job.ot?.ot_number || '-'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{job.description}</td>
                    <td className="py-3 px-4 text-muted-foreground">{job.machines?.name || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ${(job.cost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CostReport;
