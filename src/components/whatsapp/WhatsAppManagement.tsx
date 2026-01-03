import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, Settings, Users, Phone, CheckCircle, XCircle, 
  AlertTriangle, Copy, ExternalLink, RefreshCw, Info
} from 'lucide-react';

interface WorkerPhone {
  id: string;
  name: string;
  phone: string | null;
  worker_code: string | null;
  department: string;
}

interface WhatsAppGroup {
  name: string;
  phone_count: number;
  last_message?: string;
}

export function WhatsAppManagement() {
  const [workers, setWorkers] = useState<WorkerPhone[]>([]);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    fetchWorkers();
    fetchGroups();
    // Get webhook URL from env
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'lckskfqendkdvwuacdnm';
    setWebhookUrl(`https://${projectId}.supabase.co/functions/v1/whatsapp-webhook`);
  }, []);

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, phone, worker_code, department')
      .order('name');
    
    if (error) {
      toast.error('Error loading workers');
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  };

  const fetchGroups = async () => {
    const { data } = await supabase
      .from('progress_submissions')
      .select('whatsapp_group')
      .not('whatsapp_group', 'is', null);
    
    if (data) {
      const groupCounts = data.reduce((acc: Record<string, number>, item) => {
        const group = item.whatsapp_group || 'Unknown';
        acc[group] = (acc[group] || 0) + 1;
        return acc;
      }, {});
      
      setGroups(
        Object.entries(groupCounts).map(([name, count]) => ({
          name,
          phone_count: count,
        }))
      );
    }
  };

  const updateWorkerPhone = async (workerId: string, phone: string) => {
    const { error } = await supabase
      .from('workers')
      .update({ phone: phone || null })
      .eq('id', workerId);
    
    if (error) {
      toast.error('Error updating phone');
    } else {
      toast.success('Phone updated');
      fetchWorkers();
    }
  };

  const updateWorkerCode = async (workerId: string, code: string) => {
    const { error } = await supabase
      .from('workers')
      .update({ worker_code: code || null })
      .eq('id', workerId);
    
    if (error) {
      toast.error('Error updating worker code');
    } else {
      toast.success('Worker code updated');
      fetchWorkers();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const workersWithPhone = workers.filter(w => w.phone);
  const workersWithoutPhone = workers.filter(w => !w.phone);

  return (
    <div className="space-y-6">
      {/* Setup Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            WhatsApp Integration Setup
          </CardTitle>
          <CardDescription>
            Configure Twilio WhatsApp to receive worker progress reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Webhook URL (for Twilio)</Label>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this URL to your Twilio WhatsApp Sandbox or Business Account webhook settings
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                Configure Twilio
              </p>
              <p className="text-muted-foreground">Set up WhatsApp Sandbox or Business Account in Twilio Console</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                Add Webhook
              </p>
              <p className="text-muted-foreground">Paste the webhook URL above in "When a message comes in"</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
                Register Workers
              </p>
              <p className="text-muted-foreground">Add phone numbers and codes below so workers can be identified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registered Workers</p>
                <p className="text-2xl font-bold">{workersWithPhone.length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Setup</p>
                <p className="text-2xl font-bold">{workersWithoutPhone.length}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp Groups</p>
                <p className="text-2xl font-bold">{groups.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Workers</p>
                <p className="text-2xl font-bold">{workers.length}</p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workers Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Worker Phone Configuration
              </CardTitle>
              <CardDescription>
                Assign phone numbers and codes to identify workers from WhatsApp messages
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchWorkers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Workers ({workers.length})</TabsTrigger>
              <TabsTrigger value="registered">
                Registered ({workersWithPhone.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({workersWithoutPhone.length})
              </TabsTrigger>
            </TabsList>

            {['all', 'registered', 'pending'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Worker Code</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tab === 'all' ? workers : tab === 'registered' ? workersWithPhone : workersWithoutPhone)
                        .map(worker => (
                          <TableRow key={worker.id}>
                            <TableCell className="font-medium">{worker.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{worker.department}</Badge>
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={worker.worker_code || ''}
                                placeholder="e.g., JD01"
                                className="w-24 h-8 text-sm"
                                onBlur={(e) => {
                                  if (e.target.value !== worker.worker_code) {
                                    updateWorkerCode(worker.id, e.target.value);
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={worker.phone || ''}
                                placeholder="+1234567890"
                                className="w-36 h-8 text-sm"
                                onBlur={(e) => {
                                  if (e.target.value !== worker.phone) {
                                    updateWorkerPhone(worker.id, e.target.value);
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {worker.phone ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  No Phone
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Message Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Format Guide
          </CardTitle>
          <CardDescription>
            Workers should send messages in these formats to report their progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-green-600 mb-2">✅ Production Report</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                JD01 OT-2024-001 500 60
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                [Code] [OT#] [Units] [Minutes]
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-orange-600 mb-2">🔧 Maintenance</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                JD01 MAINT 45 Oil change
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                [Code] MAINT [Minutes] [Description]
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-gray-600 mb-2">⏸️ Idle Time</h4>
              <code className="text-sm bg-muted p-2 rounded block">
                JD01 IDLE 30 Waiting for materials
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                [Code] IDLE [Minutes] [Reason]
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
