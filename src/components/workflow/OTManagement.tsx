import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Package, ArrowRight, Edit2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateOTDialog } from "./CreateOTDialog";
import { EditOTDialog } from "./EditOTDialog";

interface OTManagementProps {
  onOTSelect: (ot: any) => void;
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingOT, setEditingOT] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchOTs();
  }, []);

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
  const completedOTs = filteredOTs.filter(ot => ot.status === 'completed');

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

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert className="bg-blue-500/20 border-blue-500/40">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-white">
          <strong>How to use:</strong> Click on an OT card to select it for assignment. Use the Edit button to modify details. 
          Click the status advancement button to move OTs through the workflow stages.
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Work Orders (OT)</h2>
          <p className="text-blue-200">Track and manage production workflow</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New OT
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by OT number or client..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
      />

      {/* Active OTs */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Active Work Orders</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeOTs.map((ot) => {
            const statusInfo = getStatusInfo(ot.status);
            const nextStatus = getNextStatus(ot.status);
            
            return (
              <Card
                key={ot.id}
                className="bg-white/10 border-white/20 backdrop-blur-sm p-4 hover:bg-white/15 transition-all cursor-pointer"
                onClick={() => onOTSelect(ot)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-lg">{ot.ot_number}</h4>
                      <p className="text-sm text-blue-200">{ot.client_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40">
                        P{ot.priority}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-white/20"
                        onClick={(e) => handleEditOT(ot, e)}
                      >
                        <Edit2 className="h-4 w-4 text-white" />
                      </Button>
                    </div>
                  </div>

                  {ot.description && (
                    <p className="text-sm text-white/80 line-clamp-2">{ot.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-white">
                    <Package className="w-4 h-4" />
                    <span>{ot.quantity.toLocaleString()} units</span>
                  </div>

                  <div className="space-y-2">
                    <Badge className={`${statusInfo.color} text-white w-full justify-center`}>
                      {statusInfo.label}
                    </Badge>
                    
                    {nextStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOTStatus(ot.id, nextStatus.key);
                        }}
                      >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        {nextStatus.label}
                      </Button>
                    )}
                  </div>

                  {ot.deadline && (
                    <p className="text-xs text-red-300">
                      Due: {new Date(ot.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Completed OTs */}
      {completedOTs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Completed</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {completedOTs.slice(0, 8).map((ot) => (
              <Card
                key={ot.id}
                className="bg-white/5 border-white/10 backdrop-blur-sm p-3 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => onOTSelect(ot)}
              >
                <h4 className="font-bold text-white text-sm">{ot.ot_number}</h4>
                <p className="text-xs text-blue-200">{ot.client_name}</p>
                <Badge className="bg-emerald-500 text-white mt-2 text-xs">
                  Completed
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

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