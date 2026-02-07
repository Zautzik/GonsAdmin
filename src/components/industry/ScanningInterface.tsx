import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  ArrowLeft,
  Plus,
  Minus,
  Check,
  Loader2,
  ScanBarcode,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { findItemByCode, createInventoryTransaction } from "@/hooks/useInventoryData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type ScanMode = "receive" | "usage";
type ViewState = "scanning" | "form" | "success";

interface ScannedItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number | null;
  reorder_point: number | null;
  unit_of_measure: string;
  unit_cost: number | null;
  location: string | null;
}

export default function ScanningInterface() {
  const navigate = useNavigate();
  const [viewState, setViewState] = useState<ViewState>("scanning");
  const [mode, setMode] = useState<ScanMode>("receive");
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [otNumber, setOtNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [newStock, setNewStock] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    supabase
      .from("work_orders")
      .select("id, ot_number, client_name")
      .neq("status", "completed")
      .neq("status", "delivered")
      .order("ot_number", { ascending: false })
      .limit(50)
      .then(({ data }) => setWorkOrders(data || []));
  }, []);

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleScan = useCallback(async (code: string) => {
    const item = await findItemByCode(code);
    if (item) {
      vibrate(100);
      setScannedItem(item as ScannedItem);
      setQuantity(0);
      setViewState("form");
      toast.success(`Item encontrado: ${item.name}`);
    } else {
      vibrate([100, 50, 100]);
      toast.error(`Item no encontrado: ${code}`);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const scanner = new Html5Qrcode("scan-camera-view");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
          stopCamera();
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
    return () => { stopCamera(); };
  }, [stopCamera]);

  const handleManualSearch = async () => {
    if (manualCode.trim()) {
      await handleScan(manualCode.trim());
      setManualCode("");
    }
  };

  const handleConfirm = async () => {
    if (!scannedItem || quantity <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    if (mode === "usage" && (scannedItem.current_stock ?? 0) < quantity) {
      toast.error("Stock insuficiente");
      return;
    }

    setLoading(true);
    const transactionType = mode === "receive" ? "purchase" : "usage";

    let workOrderId: string | undefined;
    if (mode === "usage" && otNumber) {
      const wo = workOrders.find((w) => w.ot_number?.toString() === otNumber);
      workOrderId = wo?.id;
    }

    const result = await createInventoryTransaction({
      inventory_id: scannedItem.id,
      transaction_type: transactionType,
      quantity,
      notes: mode === "receive" ? "Recepción vía escaneo" : `Uso vía escaneo${otNumber ? ` - OT ${otNumber}` : ""}`,
      scanned_via: "barcode",
      work_order_id: workOrderId,
    });

    setLoading(false);

    if (result) {
      const calculatedNewStock =
        mode === "receive"
          ? (scannedItem.current_stock ?? 0) + quantity
          : (scannedItem.current_stock ?? 0) - quantity;
      setNewStock(calculatedNewStock);
      setViewState("success");

      setTimeout(() => {
        setViewState("scanning");
        setScannedItem(null);
        setQuantity(0);
        setOtNumber("");
      }, 2500);
    }
  };

  const goBack = () => {
    if (viewState === "form") {
      setViewState("scanning");
      setScannedItem(null);
    } else {
      navigate(-1);
    }
  };

  // ─── Success View ────────────────────────────────
  if (viewState === "success") {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center text-center p-6">
        <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-8 animate-in zoom-in duration-300">
          <Check className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-3">Stock Actualizado</h1>
        <p className="text-lg text-muted-foreground">
          {scannedItem?.name}: <span className="font-semibold text-foreground">{newStock.toLocaleString()} {scannedItem?.unit_of_measure}</span>
        </p>
      </div>
    );
  }

  // ─── Form View ───────────────────────────────────
  if (viewState === "form" && scannedItem) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground flex-1">{scannedItem.name}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Item Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground font-mono mb-1">{scannedItem.sku}</p>
            <p className="text-sm text-muted-foreground">
              Stock actual: <span className="font-semibold text-foreground text-lg">{(scannedItem.current_stock ?? 0).toLocaleString()} {scannedItem.unit_of_measure}</span>
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "receive" ? "default" : "outline"}
              className="h-12"
              onClick={() => setMode("receive")}
            >
              Recibir
            </Button>
            <Button
              variant={mode === "usage" ? "default" : "outline"}
              className="h-12"
              onClick={() => setMode("usage")}
            >
              Usar
            </Button>
          </div>

          {/* Quantity Input */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Cantidad</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-16 w-16 shrink-0"
                onClick={() => setQuantity((p) => Math.max(0, p - 10))}
                disabled={quantity < 10}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <Input
                type="number"
                value={quantity || ""}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="text-center text-5xl font-semibold h-20"
                inputMode="numeric"
                min={0}
                placeholder="0"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-16 w-16 shrink-0"
                onClick={() => setQuantity((p) => p + 10)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">{scannedItem.unit_of_measure}</p>
            <div className="flex gap-2">
              {[10, 50, 100, 500].map((val) => (
                <Button
                  key={val}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setQuantity(val)}
                >
                  {val}
                </Button>
              ))}
            </div>
          </div>

          {/* OT for usage */}
          {mode === "usage" && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">OT # (opcional)</Label>
              <Select value={otNumber} onValueChange={setOtNumber}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Seleccionar OT..." />
                </SelectTrigger>
                <SelectContent>
                  {workOrders.map((wo) => (
                    <SelectItem key={wo.id} value={wo.ot_number?.toString()}>
                      OT-{wo.ot_number} — {wo.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="p-4 border-t bg-background">
          <Button
            className="w-full h-14 text-lg gap-2"
            onClick={handleConfirm}
            disabled={loading || quantity <= 0}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

  // ─── Scanning View ───────────────────────────────
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Escanear Inventario</h1>
      </div>

      {/* Camera Area */}
      <div className="flex-1 relative bg-black">
        {/* Instruction overlay */}
        <div className="absolute top-4 left-0 right-0 z-10 text-center">
          <p className="text-white/80 text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
            Centra el código de barras
          </p>
        </div>

        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <Camera className="h-16 w-16 text-white/30 mb-4" />
            <p className="text-white/60 text-sm mb-4">{cameraError}</p>
            <Button variant="secondary" onClick={startCamera}>
              Reintentar
            </Button>
          </div>
        ) : (
          <div id="scan-camera-view" className="w-full h-full" />
        )}

        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button size="lg" className="h-14 px-8 text-base gap-2" onClick={startCamera}>
              <Camera className="h-5 w-5" />
              Iniciar Cámara
            </Button>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Código manual..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              className="pl-11 h-12 text-base"
            />
          </div>
          <Button className="h-12 px-4" onClick={handleManualSearch} disabled={!manualCode.trim()}>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
