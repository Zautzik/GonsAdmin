import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateOTDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateOTDialog = ({ open, onOpenChange, onCreated }: CreateOTDialogProps) => {
  const { t } = useLanguage();
  const [otNumber, setOtNumber] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('ot' as any)
      .insert({
        ot_number: otNumber,
        description,
        status: 'pending',
      });

    if (error) {
      toast.error('Error creating work order');
    } else {
      toast.success('Work order created successfully');
      setOtNumber('');
      setDescription('');
      onOpenChange(false);
      onCreated();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createOT')}</DialogTitle>
          <DialogDescription>
            Create a new work order for production tracking
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otNumber">{t('otNumber')}</Label>
            <Input
              id="otNumber"
              value={otNumber}
              onChange={(e) => setOtNumber(e.target.value)}
              required
              placeholder="e.g., OT-2025-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Enter work order description"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="bg-supervisor hover:bg-supervisor/90"
              disabled={loading}
            >
              {loading ? '...' : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOTDialog;
