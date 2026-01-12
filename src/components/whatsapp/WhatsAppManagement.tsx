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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { 
  MessageSquare, Settings, Users, Phone, CheckCircle, XCircle, 
  AlertTriangle, Copy, ExternalLink, RefreshCw, Info, Key, History,
  BarChart3, Send, Clock, UserCheck, ShieldCheck, Trash2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface WorkerPhone {
  id: string;
  name: string;
  phone: string | null;
  worker_code: string | null;
  department: string;
}

interface WhatsAppUser {
  id: string;
  phone_number: string;
  whatsapp_name: string | null;
  is_verified: boolean;
  verification_code: string | null;
  last_interaction: string | null;
  created_at: string;
  worker_id: string | null;
}

interface WhatsAppMessage {
  id: string;
  direction: string;
  message_type: string;
  content: string;
  processed: boolean;
  created_at: string;
  whatsapp_users: {
    phone_number: string;
    whatsapp_name: string | null;
  } | null;
}

interface BotStats {
  totalMessages: number;
  processedMessages: number;
  productionReports: number;
  issuesReported: number;
  verifiedUsers: number;
  totalUsers: number;
}

export function WhatsAppManagement() {
  const [workers, setWorkers] = useState<WorkerPhone[]>([]);
  const [whatsappUsers, setWhatsappUsers] = useState<WhatsAppUser[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<BotStats>({
    totalMessages: 0,
    processedMessages: 0,
    productionReports: 0,
    issuesReported: 0,
    verifiedUsers: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedUser, setSelectedUser] = useState<WhatsAppUser | null>(null);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');

  useEffect(() => {
    fetchData();
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'lckskfqendkdvwuacdnm';
    setWebhookUrl(`https://${projectId}.supabase.co/functions/v1/whatsapp-webhook`);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchWorkers(),
      fetchWhatsAppUsers(),
      fetchMessages(),
      fetchStats(),
    ]);
    setLoading(false);
  };

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from('workers')
      .select('id, name, phone, worker_code, department')
      .order('name');
    
    if (!error) {
      setWorkers(data || []);
    }
  };

  const fetchWhatsAppUsers = async () => {
    const { data, error } = await supabase
      .from('whatsapp_users')
      .select('*')
      .order('last_interaction', { ascending: false, nullsFirst: false });
    
    if (!error) {
      setWhatsappUsers(data || []);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select(`
        id, direction, message_type, content, processed, created_at,
        whatsapp_users (phone_number, whatsapp_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!error) {
      setMessages((data as WhatsAppMessage[]) || []);
    }
  };

  const fetchStats = async () => {
    // Get message counts
    const { count: totalMessages } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true });
    
    const { count: processedMessages } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true);
    
    // Get production reports from WhatsApp
    const { count: productionReports } = await supabase
      .from('production_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_via', 'whatsapp');
    
    // Get issues count (approximate - issues don't have whatsapp flag yet)
    const { count: issuesReported } = await supabase
      .from('production_issues')
      .select('*', { count: 'exact', head: true });
    
    // Get user counts
    const { count: verifiedUsers } = await supabase
      .from('whatsapp_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);
    
    const { count: totalUsers } = await supabase
      .from('whatsapp_users')
      .select('*', { count: 'exact', head: true });
    
    setStats({
      totalMessages: totalMessages || 0,
      processedMessages: processedMessages || 0,
      productionReports: productionReports || 0,
      issuesReported: issuesReported || 0,
      verifiedUsers: verifiedUsers || 0,
      totalUsers: totalUsers || 0,
    });
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

  const generateVerificationCode = async (userId: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error } = await supabase
      .from('whatsapp_users')
      .update({ verification_code: code, is_verified: false })
      .eq('id', userId);
    
    if (error) {
      toast.error('Error generating code');
    } else {
      toast.success(`New verification code: ${code}`);
      fetchWhatsAppUsers();
    }
  };

  const verifyUser = async (userId: string) => {
    const { error } = await supabase
      .from('whatsapp_users')
      .update({ is_verified: true })
      .eq('id', userId);
    
    if (error) {
      toast.error('Error verifying user');
    } else {
      toast.success('User verified');
      fetchWhatsAppUsers();
    }
  };

  const deleteUser = async (userId: string) => {
    const { error } = await supabase
      .from('whatsapp_users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      toast.error('Error deleting user');
    } else {
      toast.success('User deleted');
      fetchWhatsAppUsers();
    }
  };

  const addPhoneNumber = async () => {
    if (!newPhoneNumber.trim()) {
      toast.error('Enter a phone number');
      return;
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { error } = await supabase
      .from('whatsapp_users')
      .insert({
        phone_number: newPhoneNumber.trim(),
        is_verified: false,
        verification_code: code,
      });
    
    if (error) {
      toast.error('Error adding phone number');
    } else {
      toast.success(`Phone added. Verification code: ${code}`);
      setNewPhoneNumber('');
      fetchWhatsAppUsers();
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
            WhatsApp Bot Configuration
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                Configure Twilio
              </p>
              <p className="text-muted-foreground">Set up WhatsApp Sandbox in Twilio Console</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                Add Webhook
              </p>
              <p className="text-muted-foreground">Paste webhook URL in "When a message comes in"</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
                Register Workers
              </p>
              <p className="text-muted-foreground">Add phone numbers so workers can be identified</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">4</span>
                Verify Users
              </p>
              <p className="text-muted-foreground">Workers verify with 6-digit codes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
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
                <p className="text-sm text-muted-foreground">Processed</p>
                <p className="text-2xl font-bold">{stats.processedMessages}</p>
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
                <p className="text-sm text-muted-foreground">Production Reports</p>
                <p className="text-2xl font-bold">{stats.productionReports}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issues Reported</p>
                <p className="text-2xl font-bold">{stats.issuesReported}</p>
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
                <p className="text-sm text-muted-foreground">Verified Users</p>
                <p className="text-2xl font-bold">{stats.verifiedUsers}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            WhatsApp Users
          </TabsTrigger>
          <TabsTrigger value="workers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workers
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Message History
          </TabsTrigger>
          <TabsTrigger value="commands" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Bot Commands
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Registered WhatsApp Users
                  </CardTitle>
                  <CardDescription>
                    Manage verified users who can interact with the bot
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Phone className="h-4 w-4 mr-2" />
                        Add Phone
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Phone Number</DialogTitle>
                        <DialogDescription>
                          Add a new phone number. A verification code will be generated.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            placeholder="+56912345678"
                            value={newPhoneNumber}
                            onChange={(e) => setNewPhoneNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button onClick={addPhoneNumber}>Add & Generate Code</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={fetchWhatsAppUsers}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification Code</TableHead>
                      <TableHead>Last Interaction</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whatsappUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono">{user.phone_number}</TableCell>
                        <TableCell>{user.whatsapp_name || '-'}</TableCell>
                        <TableCell>
                          {user.is_verified ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {user.verification_code || '-'}
                            </code>
                            {user.verification_code && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(user.verification_code!)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_interaction 
                            ? formatDistanceToNow(new Date(user.last_interaction), { addSuffix: true, locale: es })
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => generateVerificationCode(user.id)}
                              title="Generate new code"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            {!user.is_verified && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-green-600"
                                onClick={() => verifyUser(user.id)}
                                title="Verify manually"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteUser(user.id)}
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {whatsappUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No WhatsApp users registered yet. Users will appear when they message the bot.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workers Tab */}
        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Worker Phone Configuration
                  </CardTitle>
                  <CardDescription>
                    Link workers to their phone numbers for identification
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
                  <TabsTrigger value="all">All ({workers.length})</TabsTrigger>
                  <TabsTrigger value="registered">Registered ({workersWithPhone.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({workersWithoutPhone.length})</TabsTrigger>
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
                                    placeholder="e.g., W001"
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
                                    placeholder="+56912345678"
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
        </TabsContent>

        {/* Message History Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Message History
                  </CardTitle>
                  <CardDescription>
                    Recent WhatsApp messages (last 100)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchMessages}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`p-3 rounded-lg border ${
                        msg.direction === 'inbound' 
                          ? 'bg-muted/50 ml-0 mr-12' 
                          : 'bg-primary/5 ml-12 mr-0'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {msg.direction === 'inbound' ? '📨' : '📤'}{' '}
                          {msg.whatsapp_users?.whatsapp_name || msg.whatsapp_users?.phone_number || 'Unknown'}
                        </span>
                        <div className="flex items-center gap-2">
                          {msg.processed && (
                            <Badge variant="outline" className="text-green-600 text-xs h-5">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Processed
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: es })}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No messages yet. Messages will appear when workers interact with the bot.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Commands Tab */}
        <TabsContent value="commands">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Bot Command Reference
              </CardTitle>
              <CardDescription>
                Available commands workers can use via WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Production Report
                  </h4>
                  <div className="space-y-2 text-sm">
                    <code className="block bg-muted p-2 rounded">OT 39845 producido 1500 tiempo 2h 30m</code>
                    <code className="block bg-muted p-2 rounded">OT 39845 1500 unidades 2.5 horas</code>
                    <code className="block bg-muted p-2 rounded">produccion OT39845 qty:1500 time:150</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Reports production units and time for a work order
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-orange-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Issue Report
                  </h4>
                  <div className="space-y-2 text-sm">
                    <code className="block bg-muted p-2 rounded">problema OT 39845 máquina parada</code>
                    <code className="block bg-muted p-2 rounded">falla OT 39845 sin papel</code>
                    <code className="block bg-muted p-2 rounded">parada urgente sin materiales</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Keywords: problema, issue, parada, falla, error
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                    📦 Inventory
                  </h4>
                  <div className="space-y-2 text-sm">
                    <code className="block bg-muted p-2 rounded">recepcion [SKU123] cantidad 500kg</code>
                    <code className="block bg-muted p-2 rounded">uso [SKU123] OT 39845 cantidad 50kg</code>
                    <code className="block bg-muted p-2 rounded">stock [SKU123]</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Manage inventory receipts, usage, and stock queries
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-purple-600 mb-2 flex items-center gap-2">
                    📊 Status Query
                  </h4>
                  <div className="space-y-2 text-sm">
                    <code className="block bg-muted p-2 rounded">status OT 39845</code>
                    <code className="block bg-muted p-2 rounded">estado OT 39845</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Check work order progress and completion status
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-gray-600 mb-2 flex items-center gap-2">
                    ❓ Help
                  </h4>
                  <div className="space-y-2 text-sm">
                    <code className="block bg-muted p-2 rounded">ayuda</code>
                    <code className="block bg-muted p-2 rounded">help</code>
                    <code className="block bg-muted p-2 rounded">comandos</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Shows available commands in WhatsApp
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                    🔐 Verification
                  </h4>
                  <div className="space-y-2 text-sm">
                    <code className="block bg-muted p-2 rounded">123456</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Send 6-digit code to verify account. Get code from supervisor.
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Bot Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✅ Auto-detects message intent (production, issue, inventory, help, status)</li>
                  <li>✅ Rate limiting: 50 messages per user per hour</li>
                  <li>✅ All messages logged for audit</li>
                  <li>✅ Verification required before using most commands</li>
                  <li>✅ Friendly Spanish responses with emojis</li>
                  <li>✅ Links production reports to workers automatically</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
