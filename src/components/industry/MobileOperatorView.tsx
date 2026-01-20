import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Play, Pause, CheckCircle, AlertTriangle, Package, 
  ClipboardList, User, Mic, MicOff, RefreshCw,
  Plus, Minus, Send, ScanLine, Home
} from "lucide-react";
import ScannerDialog from "./ScannerDialog";
import IssueReportDialog from "./IssueReportDialog";

interface AssignedJob {
  id: string;
  ot_number: number;
  client_name: string;
  product_description: string | null;
  quantity: number;
  produced: number;
  status: string;
  machine?: string;
  isActive: boolean;
  startTime?: Date;
  elapsedSeconds: number;
}

export default function MobileOperatorView() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedJob, setSelectedJob] = useState<AssignedJob | null>(null);
  const [unitsProduced, setUnitsProduced] = useState(0);
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchJobs();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .in("status", ["in_production", "approved"])
      .order("priority", { ascending: true })
      .limit(10);

    if (error) {
      toast.error("Error loading jobs");
      setLoading(false);
      return;
    }

    const enrichedJobs: AssignedJob[] = (data || []).map(wo => ({
      id: wo.id,
      ot_number: wo.ot_number,
      client_name: wo.client_name,
      product_description: wo.product_description,
      quantity: wo.quantity,
      produced: Math.floor(wo.quantity * 0.3),
      status: wo.status || 'draft',
      isActive: false,
      elapsedSeconds: 0,
    }));

    setJobs(enrichedJobs);
    setLoading(false);
  };

  const handleStartJob = (job: AssignedJob) => {
    setJobs(prev => prev.map(j => ({
      ...j,
      isActive: j.id === job.id,
      startTime: j.id === job.id ? new Date() : undefined,
    })));
    setSelectedJob({ ...job, isActive: true, startTime: new Date() });

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setJobs(prev => prev.map(j => 
        j.id === job.id 
          ? { ...j, elapsedSeconds: j.elapsedSeconds + 1 }
          : j
      ));
    }, 1000);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);
    toast.success(`Started: OT-${job.ot_number}`);
  };

  const handleStopJob = (job: AssignedJob) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setJobs(prev => prev.map(j => ({
      ...j,
      isActive: false,
    })));
    
    const stoppedJob = jobs.find(j => j.id === job.id);
    if (stoppedJob) {
      setSelectedJob({ ...stoppedJob, isActive: false });
      setActiveTab("report");
    }
    
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  };

  const handleSubmitReport = async () => {
    if (!selectedJob || unitsProduced <= 0) {
      toast.error("Please enter units produced");
      return;
    }

    setSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`Reported ${unitsProduced} units for OT-${selectedJob.ot_number}`);
    if (navigator.vibrate) navigator.vibrate(100);
    
    // Play success sound
    const audio = new Audio("/notification.mp3");
    audio.play().catch(() => {});
    
    setUnitsProduced(0);
    setNotes("");
    setSelectedJob(null);
    setSubmitting(false);
    setActiveTab("home");
    fetchJobs();
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice input not supported");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'es-ES';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNotes(prev => prev + " " + transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error("Voice input error");
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleScan = (code: string) => {
    const job = jobs.find(j => `OT-${j.ot_number}` === code || String(j.ot_number) === code);
    if (job) {
      setSelectedJob(job);
      setActiveTab("report");
      toast.success(`Found: OT-${job.ot_number}`);
    } else {
      toast.error("Job not found");
    }
    setShowScanner(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeJob = jobs.find(j => j.isActive);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Operator Panel</h1>
            <p className="text-sm text-muted-foreground">{user?.email?.split('@')[0]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchJobs}>
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {/* Active Job Banner */}
        {activeJob && (
          <div className="mt-3 bg-primary/10 rounded-lg p-3 border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-primary">OT-{activeJob.ot_number}</p>
                <p className="text-2xl font-mono font-bold">{formatTime(activeJob.elapsedSeconds)}</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleStopJob(activeJob)}
              >
                <Pause className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="home" className="space-y-4 mt-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              My Jobs ({jobs.length})
            </h2>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 h-24" />
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No jobs assigned</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <Card key={job.id} className={job.isActive ? "ring-2 ring-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">OT-{job.ot_number}</span>
                            {job.isActive && <Badge variant="default">Active</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{job.client_name}</p>
                        </div>
                        <Badge variant="outline">{job.status}</Badge>
                      </div>
                      
                      {job.product_description && (
                        <p className="text-sm mb-3 line-clamp-2">{job.product_description}</p>
                      )}
                      
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{job.produced} / {job.quantity}</span>
                        </div>
                        <Progress value={(job.produced / job.quantity) * 100} className="h-2" />
                      </div>
                      
                      <div className="flex gap-2">
                        {job.isActive ? (
                          <Button 
                            variant="destructive" 
                            className="flex-1 h-12"
                            onClick={() => handleStopJob(job)}
                          >
                            <Pause className="h-5 w-5 mr-2" />
                            Stop & Report
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="default" 
                              className="flex-1 h-12"
                              onClick={() => handleStartJob(job)}
                              disabled={!!activeJob}
                            >
                              <Play className="h-5 w-5 mr-2" />
                              Start
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="h-12 w-12"
                              onClick={() => {
                                setSelectedJob(job);
                                setShowIssueDialog(true);
                              }}
                            >
                              <AlertTriangle className="h-5 w-5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="report" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedJob ? (
                  <>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="font-bold">OT-{selectedJob.ot_number}</p>
                      <p className="text-sm text-muted-foreground">{selectedJob.client_name}</p>
                    </div>
                    
                    {/* Units Input */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Units Produced</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-14 w-14"
                          onClick={() => setUnitsProduced(Math.max(0, unitsProduced - 10))}
                        >
                          <Minus className="h-6 w-6" />
                        </Button>
                        <Input
                          type="number"
                          value={unitsProduced}
                          onChange={(e) => setUnitsProduced(parseInt(e.target.value) || 0)}
                          className="h-14 text-2xl font-bold text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-14 w-14"
                          onClick={() => setUnitsProduced(unitsProduced + 10)}
                        >
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Notes with Voice */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Notes</label>
                      <div className="relative">
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes..."
                          className="pr-12 min-h-[100px]"
                        />
                        <Button
                          variant={isListening ? "destructive" : "ghost"}
                          size="icon"
                          className="absolute right-2 top-2"
                          onClick={handleVoiceInput}
                        >
                          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                    
                    <Button
                      className="w-full h-14 text-lg"
                      onClick={handleSubmitReport}
                      disabled={submitting || unitsProduced <= 0}
                    >
                      {submitting ? (
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5 mr-2" />
                      )}
                      Submit Report
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a job to report</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setShowScanner(true)}
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      Scan OT Barcode
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scan" className="mt-0">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-8">
                  <ScanLine className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Scan Inventory</h3>
                  <p className="text-muted-foreground mb-4">
                    Scan barcodes to track material usage
                  </p>
                  <Button onClick={() => setShowScanner(true)} size="lg">
                    Open Scanner
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Report Issue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Report a problem with your current job
                </p>
                <Button 
                  variant="outline" 
                  className="w-full h-12"
                  onClick={() => {
                    if (!selectedJob && jobs.length > 0) {
                      setSelectedJob(jobs[0]);
                    }
                    setShowIssueDialog(true);
                  }}
                >
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Report an Issue
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{user?.email?.split('@')[0]}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-primary">12</p>
                      <p className="text-sm text-muted-foreground">Jobs Today</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">2,450</p>
                      <p className="text-sm text-muted-foreground">Units Today</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
        <div className="grid grid-cols-5 h-16">
          {[
            { value: "home", icon: Home, label: "Home" },
            { value: "report", icon: Send, label: "Report" },
            { value: "scan", icon: ScanLine, label: "Scan" },
            { value: "issues", icon: AlertTriangle, label: "Issues" },
            { value: "profile", icon: User, label: "Profile" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={`flex flex-col items-center justify-center gap-0.5 ${
                activeTab === item.value ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Dialogs */}
      {showScanner && (
        <ScannerDialog
          open={showScanner}
          onOpenChange={setShowScanner}
          onScan={handleScan}
        />
      )}

      {showIssueDialog && selectedJob && (
        <IssueReportDialog
          open={showIssueDialog}
          onOpenChange={setShowIssueDialog}
          ot={selectedJob}
          onSuccess={() => {
            setShowIssueDialog(false);
            toast.success("Issue reported successfully");
          }}
        />
      )}
    </div>
  );
}
