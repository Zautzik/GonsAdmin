import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import AddJobToOTDialog from './AddJobToOTDialog';

interface OTCardProps {
  ot: any;
  onUpdate: () => void;
}

const OTCard = ({ ot, onUpdate }: OTCardProps) => {
  const { t } = useLanguage();
  const [showAddJob, setShowAddJob] = useState(false);

  const totalCost = ot.jobs?.reduce((sum: number, job: any) => sum + (job.cost || 0), 0) || 0;
  const completedJobs = ot.jobs?.filter((j: any) => j.status === 'completed').length || 0;
  const totalJobs = ot.jobs?.length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-supervisor/20 text-supervisor';
      case 'in_progress':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-accent/20 text-accent';
    }
  };

  return (
    <>
      <Card className="border-supervisor/20 hover:border-supervisor/40 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-bold">{ot.ot_number}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{ot.description}</p>
            </div>
            <Badge className={getStatusColor(ot.status)}>
              {t(ot.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('jobs')}</span>
            <span className="font-medium">{completedJobs}/{totalJobs}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {t('totalCost')}
            </span>
            <span className="font-bold text-supervisor">${totalCost.toFixed(2)}</span>
          </div>
          <Button
            onClick={() => setShowAddJob(true)}
            variant="outline"
            size="sm"
            className="w-full border-supervisor/30 text-supervisor hover:bg-supervisor/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addJob')}
          </Button>
        </CardContent>
      </Card>

      <AddJobToOTDialog
        open={showAddJob}
        onOpenChange={setShowAddJob}
        otId={ot.id}
        onJobAdded={onUpdate}
      />
    </>
  );
};

export default OTCard;
