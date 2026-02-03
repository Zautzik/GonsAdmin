import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { 
  Users, 
  Factory, 
  Clock, 
  CalendarDays, 
  ClipboardList, 
  ArrowLeft,
  Sparkles,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function WorkflowDashboard() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const { toast } = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleBackToDashboard = () => {
    navigate('/admin');
  };

  useEffect(() => {
    fetchShifts();
    fetchWorkers();
    fetchWorkstations();
    fetchWorkOrders();
  }, []);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("start_time");

    if (!error) {
      setShifts(data || []);
    }
  };

  const fetchWorkers = async () => {
    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .order("overall_rating", { ascending: false });

    if (!error) {
      setWorkers(data || []);
    }
  };

  const fetchWorkstations = async () => {
    const { data, error } = await supabase
      .from("workstations")
      .select("*")
      .order("name");

    if (!error) {
      setWorkstations(data || []);
    }
  };

  const fetchWorkOrders = async () => {
    const { data, error } = await supabase
      .from("work_orders")
      .select("*")
      .order("ot_number", { ascending: false })
      .limit(20);

    if (!error) {
      setWorkOrders(data || []);
    }
  };

  const multiSkillWorkers = workers.filter(w => (w.specialty?.length || 0) > 1).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToDashboard}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Volver' : 'Back'}
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Factory className="w-5 h-5 text-primary" />
                  {language === 'es' ? 'Gestión de Taller' : 'Workshop Manager'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Users className="w-3 h-3 mr-1" />
                  {workers.length} {language === 'es' ? 'trabajadores' : 'workers'}
                </Badge>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  {workstations.length} {language === 'es' ? 'estaciones' : 'stations'}
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {multiSkillWorkers} multi-skill
                </Badge>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 animate-fade-in">
        <Tabs defaultValue="workers" className="w-full">
          <TabsList className="bg-muted/50 border border-border mb-6 p-1">
            <TabsTrigger 
              value="workers" 
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Trabajadores' : 'Workers'}
            </TabsTrigger>
            <TabsTrigger 
              value="workstations" 
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Package className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Estaciones' : 'Workstations'}
            </TabsTrigger>
            <TabsTrigger 
              value="ots" 
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Órdenes' : 'Work Orders'}
            </TabsTrigger>
            <TabsTrigger 
              value="shifts" 
              className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Clock className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Turnos' : 'Shifts'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workers" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((worker) => (
                <Card key={worker.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {worker.name}
                      <Badge variant="outline">{worker.department}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rating:</span>
                        <span className="font-medium">{worker.overall_rating}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <span>{worker.worker_role || 'Operator'}</span>
                      </div>
                      {worker.specialty?.length > 0 && (
                        <div className="flex gap-1 flex-wrap pt-2">
                          {worker.specialty.map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="workstations" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workstations.map((ws) => (
                <Card key={ws.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {ws.name}
                      <Badge variant={ws.status === 'active' ? 'default' : 'secondary'}>
                        {ws.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{ws.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Workers:</span>
                        <span>{ws.max_workers}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ots" className="mt-0">
            <div className="space-y-4">
              {workOrders.map((wo) => (
                <Card key={wo.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/ots/${wo.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">OT-{wo.ot_number}: {wo.product_name}</p>
                        <p className="text-sm text-muted-foreground">{wo.client_name} - {wo.quantity} units</p>
                      </div>
                      <Badge variant={wo.status === 'completed' ? 'default' : 'secondary'}>
                        {wo.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shifts" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shifts.map((shift) => (
                <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{shift.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Hours:</span>
                      <span className="ml-2">{shift.start_time} - {shift.end_time}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}