import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowRight, Edit2, Info, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateOTDialog } from "./CreateOTDialog";
import { EditOTDialog } from "./EditOTDialog";
import { useTranslation } from "react-i18next";

interface OTManagementProps {
  onOTSelect: (ot: any) => void;
}

interface Machine {
  id: string;
  name: string;
  type: string;
}

const STATUS_FLOW = [
  { key: 'paper_purchase', label: 'Paper Purchase', color: 'bg-gray-500' },
  { key: 'paper_received', label: 'Paper Received', color: 'bg-blue-500' },
  { key: 'in_storage', label: 'In Storage', color: 'bg-purple-500' },
  { key: 'guillotine_first_cut', label: 'First Cut', color: 'bg-orange-500' },
  { key: 'offset_printing', label: 'Printing', color: 'bg-indigo-500' },
  { key: 'die_cutting', label: 'Die Cutting', color: 'bg-pink-500' },
  { key: 'guillotine_final_cut', label: 'Final Cut', color: 'bg-orange-600' },
  { key: 'workshop_revision', label: 'Revision', color: 'bg-green-500' },
  { key: 'ready_for_delivery', label: 'Ready', color: 'bg-teal-500' },
  { key: 'in_delivery', label: 'In Delivery', color: 'bg-yellow-500' },
  { key: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

export function OTManagement({ onOTSelect }: OTManagementProps) {
  const [ots, setOts] = useState<any[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOT, setEditingOT] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchOTs();
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast({ title: "Error fetching machines", variant: "destructive" });
      return;
    }
    setMachines(data || []);
  };

  const fetchOTs = async () => {
    const { data, error } = await supabase
      .from("ots")
      .select("*, workstation:workstations(*)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching OTs", variant: "destructive" });
      return;
    }
    setOts(data || []);
  };

  const updateOTStatus = async (otId: string, newStatus: any) => {
    const { error } = await supabase
      .from("ots")
      .update({ status: newStatus as any })
      .eq("id", otId);

    if (error) {
      toast({ title: "Error updating OT status", variant: "destructive" });
      return;
    }
    
    toast({ title: "OT status updated successfully" });
    fetchOTs();
  };

  const filteredOTs = ots.filter(ot => 
    ot.ot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ot.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeOTs = filteredOTs.filter(ot => ot.status !== 'completed');

  const getStatusInfo = (status: string) => {
    return STATUS_FLOW.find(s => s.key === status) || STATUS_FLOW[0];
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = STATUS_FLOW.findIndex(s => s.key === currentStatus);
    if (currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  const handleEditOT = (ot: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOT(ot);
    setShowEditDialog(true);
  };

  // Group machines by type for column headers
  const machinesByType = machines.reduce((acc: any, machine) => {
    if (!acc[machine.type]) {
      acc[machine.type] = [];
    }
    acc[machine.type].push(machine);
    return acc;
  }, {});

  const getMachineTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      offset_printer: t('machines.offsetPrinters'),
      guillotine: t('machines.guillotineCutters'),
      die_cutter: t('machines.dieCutters'),
      workshop: t('machines.workshopStations')
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert className="bg-blue-500/20 border-blue-500/40">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-white">
          <strong>How to use:</strong> This grid shows your work orders organized by machine columns. 
          Orders are sorted by priority and timing. Click Edit to modify details or use status buttons to advance workflow.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('ot.title')}</h2>
          <p className="text-blue-200">Production workflow organized by machines</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('ot.new')}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={t('ot.searchPlaceholder')}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
      />

      {/* Grid Layout - Machines as Columns, OTs as Rows */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Column Headers - Machine Groups */}
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `200px repeat(${machines.length}, minmax(200px, 1fr))` }}>
            <div className="bg-primary/20 border-2 border-primary/40 rounded-lg p-3">
              <h3 className="font-bold text-white text-center">OT Details</h3>
            </div>
            {Object.entries(machinesByType).map(([type, typeMachines]: [string, any]) => (
              <div key={type} className="space-y-2">
                <div className="bg-supervisor/20 border-2 border-supervisor/40 rounded-lg p-2">
                  <h4 className="font-bold text-white text-center text-sm">{getMachineTypeLabel(type)}</h4>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {typeMachines.map((machine: Machine) => (
                    <div key={machine.id} className="bg-white/10 border border-white/20 rounded p-1 text-center">
                      <p className="text-xs text-white font-medium truncate">{machine.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* OT Rows */}
          <div className="space-y-2">
            {activeOTs.map((ot) => {
              const statusInfo = getStatusInfo(ot.status);
              const nextStatus = getNextStatus(ot.status);
              
              return (
                <div 
                  key={ot.id} 
                  className="grid gap-2 items-start"
                  style={{ gridTemplateColumns: `200px repeat(${machines.length}, minmax(200px, 1fr))` }}
                >
                  {/* OT Info Column */}
                  <Card 
                    className="bg-white/10 border-white/20 backdrop-blur-sm p-3 hover:bg-white/15 transition-all cursor-pointer h-full"
                    onClick={() => onOTSelect(ot)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{ot.ot_number}</h4>
                          <p className="text-xs text-blue-200 truncate">{ot.client_name}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-white/20 flex-shrink-0"
                          onClick={(e) => handleEditOT(ot, e)}
                        >
                          <Edit2 className="h-3 w-3 text-white" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-white">
                        <Package className="w-3 h-3" />
                        <span className="truncate">{ot.quantity.toLocaleString()}</span>
                      </div>

                      <Badge className={`${statusInfo.color} text-white w-full justify-center text-xs py-0.5`}>
                        {statusInfo.label}
                      </Badge>
                      
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 w-full justify-center text-xs">
                        P{ot.priority}
                      </Badge>

                      {nextStatus && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOTStatus(ot.id, nextStatus.key);
                          }}
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Next
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* Machine Assignment Columns */}
                  {machines.map((machine) => (
                    <div 
                      key={machine.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-2 min-h-[180px] flex items-center justify-center"
                    >
                      {ot.workstation?.id === machine.id ? (
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-2">
                            <span className="text-lg">✓</span>
                          </div>
                          <p className="text-xs text-green-300">Assigned</p>
                        </div>
                      ) : (
                        <div className="text-center text-white/20">
                          <span className="text-xs">-</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CreateOTDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchOTs}
      />

      {editingOT && (
        <EditOTDialog
          ot={editingOT}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={fetchOTs}
        />
      )}
    </div>
  );
}
