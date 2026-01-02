import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, Check, X, Edit, Clock, User, Package, 
  AlertTriangle, Phone, FileText, RefreshCw, History
} from 'lucide-react';

interface ProgressSubmission {
  id: string;
  worker_phone: string;
  worker_id: string | null;
  worker_code: string | null;
  ot_id: string | null;
  workstation_id: string | null;
  machine_id: string | null;
  submission_type: 'production' | 'maintenance' | 'idle';
  units_reported: number;
  time_reported_minutes: number;
  quality_notes: string | null;
  idle_reason: string | null;
  maintenance_description: string | null;
  raw_message: string;
  whatsapp_group: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  reviewed_by: string | null;
  reviewed_at: string | null;
  supervisor_notes: string | null;
  rejection_reason: string | null;
  edited_units: number | null;
  edited_time_minutes: number | null;
  edited_ot_id: string | null;
  submitted_at: string;
  workers?: { name: string; department: string } | null;
  ots?: { ot_number: string; client_name: string } | null;
  machines?: { name: string } | null;
}

interface OT {
  id: string;
  ot_number: string;
  client_name: string;
}

const ProgressApprovalDashboard = () => {
  const { t } = useLanguage();
  const [submissions, setSubmissions] = useState<ProgressSubmission[]>([]);
  const [ots, setOts] = useState<OT[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ProgressSubmission | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  
  // Edit form state
  const [editUnits, setEditUnits] = useState(0);
  const [editTime, setEditTime] = useState(0);
  const [editOtId, setEditOtId] = useState<string>('');
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchSubmissions();
    fetchOTs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('progress-submissions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'progress_submissions' },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from('progress_submissions')
      .select(`
        *,
        workers:worker_id(name, department),
        machines:machine_id(name)
      `)
      .order('submitted_at', { ascending: false });
    
    if (error) {
      toast.error('Error loading submissions');
      console.error(error);
    } else {
      // Fetch OT data separately to avoid ambiguous relationship
      const submissionsWithOts = await Promise.all(
        (data || []).map(async (sub) => {
          if (sub.ot_id) {
            const { data: ot } = await supabase
              .from('ots')
              .select('ot_number, client_name')
              .eq('id', sub.ot_id)
              .maybeSingle();
            return { ...sub, ots: ot };
          }
          return { ...sub, ots: null };
        })
      );
      setSubmissions(submissionsWithOts as ProgressSubmission[]);
    }
    setLoading(false);
  };

  const fetchOTs = async () => {
    const { data } = await supabase
      .from('ots')
      .select('id, ot_number, client_name')
      .neq('status', 'completed')
      .order('ot_number');
    setOts(data || []);
  };

  const handleApprove = async (submission: ProgressSubmission) => {
    const { error } = await supabase
      .from('progress_submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission.id);
    
    if (error) {
      toast.error('Error approving submission');
    } else {
      toast.success('Submission approved');
      fetchSubmissions();
    }
  };

  const openEditDialog = (submission: ProgressSubmission) => {
    setSelectedSubmission(submission);
    setEditUnits(submission.units_reported);
    setEditTime(submission.time_reported_minutes);
    setEditOtId(submission.ot_id || '');
    setSupervisorNotes('');
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedSubmission) return;
    
    const { error } = await supabase
      .from('progress_submissions')
      .update({
        status: 'edited',
        edited_units: editUnits,
        edited_time_minutes: editTime,
        edited_ot_id: editOtId || null,
        supervisor_notes: supervisorNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedSubmission.id);
    
    if (error) {
      toast.error('Error updating submission');
    } else {
      toast.success('Submission edited and approved');
      setEditDialogOpen(false);
      fetchSubmissions();
    }
  };

  const openRejectDialog = (submission: ProgressSubmission) => {
    setSelectedSubmission(submission);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    
    const { error } = await supabase
      .from('progress_submissions')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedSubmission.id);
    
    if (error) {
      toast.error('Error rejecting submission');
    } else {
      toast.success('Submission rejected');
      setRejectDialogOpen(false);
      fetchSubmissions();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'edited':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Edit className="w-3 h-3 mr-1" />Edited</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'production':
        return <Badge className="bg-primary/10 text-primary border-primary/30"><Package className="w-3 h-3 mr-1" />Production</Badge>;
      case 'maintenance':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">🔧 Maintenance</Badge>;
      case 'idle':
        return <Badge className="bg-muted text-muted-foreground">⏸️ Idle</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}min` : ''}`.trim() || '0min';
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'pending');

  if (loading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">{t('whatsappProgress') || 'WhatsApp Progress Reports'}</h2>
            <p className="text-sm text-muted-foreground">{t('reviewWorkerSubmissions') || 'Review and approve worker submissions'}</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchSubmissions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {pendingSubmissions.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              {pendingSubmissions.length} Pending Approval
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>All submissions reviewed!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(submission.submission_type)}
                          {getStatusBadge(submission.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {submission.workers?.name || submission.worker_code || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            +{submission.worker_phone}
                          </span>
                        </div>

                        {submission.submission_type === 'production' && (
                          <div className="flex items-center gap-4 text-sm font-medium">
                            <span className="flex items-center gap-1">
                              <Package className="w-4 h-4 text-primary" />
                              {submission.units_reported} units
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-primary" />
                              {formatTime(submission.time_reported_minutes)}
                            </span>
                            {submission.ots && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-4 h-4 text-primary" />
                                {submission.ots.ot_number}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="p-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">Raw message: </span>
                          "{submission.raw_message}"
                        </div>

                        {submission.quality_notes && (
                          <p className="text-sm text-orange-600">
                            ⚠️ {submission.quality_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => handleApprove(submission)} className="bg-green-600 hover:bg-green-700">
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(submission)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openRejectDialog(submission)}>
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reported</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewedSubmissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{s.workers?.name || s.worker_code || '-'}</TableCell>
                      <TableCell>{getTypeBadge(s.submission_type)}</TableCell>
                      <TableCell>
                        {s.submission_type === 'production' && (
                          <span>{s.units_reported} / {formatTime(s.time_reported_minutes)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.status === 'edited' && s.edited_units !== null ? (
                          <span className="text-blue-600">
                            {s.edited_units} / {formatTime(s.edited_time_minutes || 0)}
                          </span>
                        ) : s.submission_type === 'production' ? (
                          <span>{s.units_reported} / {formatTime(s.time_reported_minutes)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{s.ots?.ot_number || '-'}</TableCell>
                      <TableCell>{getStatusBadge(s.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded text-sm">
              <span className="text-muted-foreground">Original: </span>
              "{selectedSubmission?.raw_message}"
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Units</label>
                <Input 
                  type="number" 
                  value={editUnits} 
                  onChange={(e) => setEditUnits(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time (minutes)</label>
                <Input 
                  type="number" 
                  value={editTime} 
                  onChange={(e) => setEditTime(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">OT</label>
              <Select value={editOtId} onValueChange={setEditOtId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select OT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {ots.map((ot) => (
                    <SelectItem key={ot.id} value={ot.id}>
                      {ot.ot_number} - {ot.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Supervisor Notes</label>
              <Textarea 
                value={supervisorNotes}
                onChange={(e) => setSupervisorNotes(e.target.value)}
                placeholder="Reason for edit..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save & Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded text-sm">
              <span className="text-muted-foreground">Message: </span>
              "{selectedSubmission?.raw_message}"
            </div>
            
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this is being rejected..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgressApprovalDashboard;
