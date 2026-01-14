import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Camera,
  Flashlight,
  FlashlightOff,
  Keyboard,
  Volume2,
  VolumeX,
  History,
  Check,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  mode?: "search" | "receive" | "usage" | "adjustment";
}

export default function ScannerDialog({
  open,
  onOpenChange,
  onScan,
  mode = "search",
}: ScannerDialogProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [flashOn, setFlashOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const playBeep = useCallback(() => {
    if (!soundOn) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 100);
    } catch (e) {
      // Audio not supported
    }
  }, [soundOn]);

  const handleSuccessfulScan = useCallback(
    (decodedText: string) => {
      playBeep();
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      setScanHistory((prev) => [decodedText, ...prev.slice(0, 9)]);
      onScan(decodedText);
      toast.success(`Código escaneado: ${decodedText}`);
    },
    [onScan, playBeep]
  );

  const startScanner = useCallback(async () => {
    if (!scannerContainerRef.current || scannerRef.current) return;

    try {
      setCameraError(null);
      const scanner = new Html5Qrcode("scanner-container");
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Ignore scan errors (no code found)
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setCameraError(err?.message || "No se pudo acceder a la cámara");
      setActiveTab("manual");
    }
  }, [handleSuccessfulScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (open && activeTab === "camera") {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, activeTab, startScanner, stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
      setManualCode("");
    }
  };

  const handleHistoryClick = (code: string) => {
    onScan(code);
  };

  const getModeTitle = () => {
    switch (mode) {
      case "receive":
        return "Escanear para Recepción";
      case "usage":
        return "Escanear para Uso";
      case "adjustment":
        return "Escanear para Ajuste";
      default:
        return "Escanear Código";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {getModeTitle()}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "camera" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="gap-2">
              <Camera className="h-4 w-4" />
              Cámara
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setCameraError(null);
                      startScanner();
                    }}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : (
                <div id="scanner-container" ref={scannerContainerRef} className="w-full h-full" />
              )}
            </div>

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFlashOn(!flashOn)}
                disabled={!isScanning}
              >
                {flashOn ? (
                  <Flashlight className="h-4 w-4" />
                ) : (
                  <FlashlightOff className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setSoundOn(!soundOn)}>
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Apunta la cámara al código de barras o QR
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Código SKU / Barcode / QR</Label>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ingresa o escanea el código..."
                    autoFocus
                  />
                  <Button type="submit" disabled={!manualCode.trim()}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>

            {scanHistory.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial reciente
                </Label>
                <div className="flex flex-wrap gap-2">
                  {scanHistory.map((code, i) => (
                    <Badge
                      key={`${code}-${i}`}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleHistoryClick(code)}
                    >
                      {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
