import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateOTDialog from './CreateOTDialog';
import OTCard from './OTCard';

const OTManagement = () => {
  const { t } = useLanguage();
  const [ots, setOts] = useState<any[]>([]);
  const [showCreateOT, setShowCreateOT] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOTs();
  }, []);

  const fetchOTs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ot' as any)
      .select('*, jobs(id, description, status, cost)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error loading work orders');
    } else {
      setOts(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-supervisor/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-supervisor flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('otList')}
          </CardTitle>
          <Button
            onClick={() => setShowCreateOT(true)}
            className="bg-supervisor hover:bg-supervisor/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addOT')}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : ots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noData')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ots.map((ot) => (
                <OTCard key={ot.id} ot={ot} onUpdate={fetchOTs} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOTDialog
        open={showCreateOT}
        onOpenChange={setShowCreateOT}
        onCreated={fetchOTs}
      />
    </div>
  );
};

export default OTManagement;
