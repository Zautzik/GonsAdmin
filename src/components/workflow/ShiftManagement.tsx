import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShiftManagementProps {
  onShiftChange: () => void;
}

/**
 * ShiftManagement - Manage work shifts
 * Display shift information and allow switching between shifts
 */
export function ShiftManagement({ onShiftChange }: ShiftManagementProps) {
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("start_time");

    if (error) {
      toast({ title: "Error fetching shifts", variant: "destructive" });
      return;
    }
    setShifts(data || []);
    if (data && data.length > 0) {
      setActiveShift(data[0].id);
    }
  };

  const getShiftIcon = (name: string) => {
    if (name.toLowerCase().includes("morning")) return <Sun className="w-5 h-5" />;
    return <Moon className="w-5 h-5" />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {shifts.map((shift) => (
        <Card
          key={shift.id}
          className={`p-6 cursor-pointer transition-all ${
            activeShift === shift.id
              ? "bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-2 border-blue-400 scale-105"
              : "bg-white/10 border-white/20 hover:bg-white/15"
          } backdrop-blur-sm`}
          onClick={() => {
            setActiveShift(shift.id);
            onShiftChange();
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {getShiftIcon(shift.name)}
              <h3 className="text-xl font-bold text-white">{shift.name}</h3>
            </div>
            {activeShift === shift.id && (
              <Badge className="bg-green-500 text-white">Active</Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-blue-300" />
              <span className="text-sm">
                {shift.start_time} - {shift.end_time}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
