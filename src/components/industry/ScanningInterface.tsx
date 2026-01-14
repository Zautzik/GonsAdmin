import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Scan,
  Check,
  Plus,
  Minus,
  Camera,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { findItemByCode, createInventoryTransaction, useSuppliers } from "@/hooks/useInventoryData";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InventoryItem = Database["public"]["Tables"]["inventory_items"]["Row"];

type ScanMode = "receive" | "usage" | "adjustment";

export default function ScanningInterface() {
  const [mode, setMode] = useState<ScanMode>("receive");
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [otNumber, setOtNumber] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [location, setLocation] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<{ code: string; item: string; time: Date }[]>([]);
  const [ots, setOts] = useState<any[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { suppliers } = useSuppliers();

  // Fetch active OTs for autocomplete
  useEffect(() => {
    const fetchOTs = async () => {
      const { data } = await supabase
        .from("ots")
        .select("id, ot_number, client_name")
        .neq("status", "completed")
        .order("ot_number", { ascending: false })
        .limit(50);
      setOts(data || []);
    };
    fetchOTs();
  }, []);

  const playBeep = useCallback((success: boolean) => {
    if (!soundOn) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = success ? 800 : 300;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, success ? 100 : 300);
    } catch (e) {
      // Audio not supported
    }
  }, [soundOn]);

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const handleScan = useCallback(async (code: string) => {
    const item = await findItemByCode(code);
    if (item) {
      playBeep(true);
      vibrate(100);
      setScannedItem(item);
      setUnitCost(item.unit_cost?.toString() || "");
      setLocation(item.location || "");
      setScanHistory(prev => [{ code, item: item.name, time: new Date() }, ...prev.slice(0, 9)]);
      toast.success(`✅ Item encontrado: ${item.name}`);
    } else {
      playBeep(false);
      vibrate([100, 50, 100]);
      toast.error(`❌ Item no encontrado: ${code}`);
    }
  }, [playBeep]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const scanner = new Html5Qrcode("scan-camera-container");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      setCameraError(err?.message || "No se pudo acceder a la cámara");
    }
  }, [handleScan]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {}
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleManualSearch = async () => {
    if (manualCode.trim()) {
      await handleScan(manualCode.trim());
      setManualCode("");
    }
  };

  const handleConfirmReceive = async () => {
    if (!scannedItem || !quantity) {
      toast.error("Ingresa la cantidad");
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad inválida");
      return;
    }

    setLoading(true);
    try {
      await createInventoryTransaction({
        inventory_item_id: scannedItem.id,
        transaction_type: "purchase",
        quantity: qty,
        unit_cost: parseFloat(unitCost) || undefined,
        notes: notes || `Recepción - PO: ${poNumber || "N/A"}, Ubicación: ${location || "N/A"}`,
        scanned_via: "barcode",
      });

      toast.success(`✅ Ingresado: ${scannedItem.name}, ${qty} ${scannedItem.unit_of_measure}. Stock: ${(scannedItem.current_stock || 0) + qty}`);
      playBeep(true);
      vibrate(200);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUsage = async () => {
    if (!scannedItem || !quantity) {
      toast.error("Ingresa la cantidad");
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad inválida");
      return;
    }

    if ((scannedItem.current_stock || 0) < qty) {
      toast.error("Stock insuficiente");
      return;
    }

    setLoading(true);
    try {
      // Find OT ID if provided
      let workOrderId: string | undefined;
      if (otNumber) {
        const ot = ots.find(o => o.ot_number === otNumber || o.ot_number.includes(otNumber));
        if (ot) {
          const { data: wo } = await supabase
            .from("work_orders")
            .select("id")
            .eq("ot_number", parseInt(ot.ot_number.replace("OT-", "")))
            .single();
          workOrderId = wo?.id;
        }
      }

      await createInventoryTransaction({
        inventory_item_id: scannedItem.id,
        transaction_type: "usage",
        quantity: qty,
        work_order_id: workOrderId,
        notes: notes || `Uso - OT: ${otNumber || "N/A"}`,
        scanned_via: "barcode",
      });

      const newStock = (scannedItem.current_stock || 0) - qty;
      const reorderWarning = scannedItem.reorder_point && newStock <= scannedItem.reorder_point;
      
      toast.success(
        `✅ Registrado uso: ${scannedItem.name} ${qty}${scannedItem.unit_of_measure}${otNumber ? ` para ${otNumber}` : ""}. Stock: ${newStock}${reorderWarning ? " (reordenar pronto)" : ""}`
      );
      playBeep(true);
      vibrate(200);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAdjustment = async () => {
    if (!scannedItem || !quantity || !adjustmentReason) {
      toast.error("Completa todos los campos");
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) {
      toast.error("Cantidad inválida");
      return;
    }

    setLoading(true);
    try {
      await createInventoryTransaction({
        inventory_item_id: scannedItem.id,
        transaction_type: "adjustment",
        quantity: qty,
        notes: `${adjustmentReason}: ${notes}`,
        scanned_via: "manual",
      });

      toast.success(`✅ Ajuste aplicado: ${scannedItem.name} = ${qty} ${scannedItem.unit_of_measure}`);
      playBeep(true);
      vibrate(200);
      resetForm();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setScannedItem(null);
    setQuantity("");
    setOtNumber("");
    setPoNumber("");
    setLocation("");
    setUnitCost("");
    setNotes("");
    setAdjustmentReason("");
  };

  const getModeInfo = () => {
    switch (mode) {
      case "receive":
        return { title: "📦 Recepción de Inventario", color: "bg-green-500" };
      case "usage":
        return { title: "🏭 Registrar Uso", color: "bg-blue-500" };
      case "adjustment":
        return { title: "🔄 Ajuste de Stock", color: "bg-orange-500" };
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Mode Selector */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as ScanMode); resetForm(); }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receive" className="text-xs md:text-sm">📦 Recepción</TabsTrigger>
          <TabsTrigger value="usage" className="text-xs md:text-sm">🏭 Uso</TabsTrigger>
          <TabsTrigger value="adjustment" className="text-xs md:text-sm">🔄 Ajuste</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Scanner Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Escanear Item
            </span>
            <Button variant="ghost" size="icon" onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera View */}
          <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
              </div>
            ) : (
              <div id="scan-camera-container" className="w-full h-full" />
            )}
          </div>

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Iniciar Cámara
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="flex-1">
                Detener Cámara
              </Button>
            )}
          </div>

          {/* Manual Input */}
          <div className="flex gap-2">
            <Input
              placeholder="SKU / Código de barras..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            />
            <Button onClick={handleManualSearch}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scanned Item Info */}
      {scannedItem && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{scannedItem.name}</h3>
                <p className="text-sm text-muted-foreground font-mono">{scannedItem.sku}</p>
              </div>
              <Badge variant="outline">{scannedItem.category}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Stock Actual:</span>
                <span className="ml-2 font-semibold">
                  {scannedItem.current_stock} {scannedItem.unit_of_measure}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reorden:</span>
                <span className="ml-2">{scannedItem.reorder_point || "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Section */}
      {scannedItem && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{getModeInfo().title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quantity Input - Large for mobile */}
            <div className="space-y-2">
              <Label className="text-lg">Cantidad</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setQuantity((prev) => Math.max(0, parseFloat(prev || "0") - 1).toString())}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-center text-2xl h-12 font-bold"
                  placeholder="0"
                  inputMode="decimal"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={() => setQuantity((prev) => (parseFloat(prev || "0") + 1).toString())}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">{scannedItem.unit_of_measure}</p>
            </div>

            {/* Mode-specific fields */}
            {mode === "receive" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Orden de Compra</Label>
                    <Input
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="PO-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Costo Unitario</Label>
                    <Input
                      type="number"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Bodega A, Rack 1"
                  />
                </div>
              </>
            )}

            {mode === "usage" && (
              <div className="space-y-2">
                <Label>Número de OT</Label>
                <Select value={otNumber} onValueChange={setOtNumber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar OT..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ots.map((ot) => (
                      <SelectItem key={ot.id} value={ot.ot_number}>
                        {ot.ot_number} - {ot.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "adjustment" && (
              <div className="space-y-2">
                <Label>Razón del Ajuste</Label>
                <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar razón..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Dañado</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                    <SelectItem value="found">Encontrado</SelectItem>
                    <SelectItem value="correction">Corrección</SelectItem>
                    <SelectItem value="inventory">Inventario físico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={
                  mode === "receive"
                    ? handleConfirmReceive
                    : mode === "usage"
                    ? handleConfirmUsage
                    : handleConfirmAdjustment
                }
                disabled={loading || !quantity}
                className="flex-1 h-12 text-lg"
              >
                <Check className="h-5 w-5 mr-2" />
                Confirmar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Historial Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanHistory.slice(0, 5).map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted"
                  onClick={() => handleScan(h.code)}
                >
                  <span className="font-medium">{h.item}</span>
                  <span className="text-muted-foreground font-mono text-xs">{h.code}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
