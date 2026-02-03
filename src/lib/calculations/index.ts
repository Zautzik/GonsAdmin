// ============================================
// SHEET FORMAT & OPTIMIZATION CALCULATIONS
// ============================================

export interface SheetFormat {
  name: string;
  width: number; // cm
  height: number; // cm
}

export const SHEET_FORMATS: SheetFormat[] = [
  { name: '35x50', width: 35, height: 50 },
  { name: '50x70', width: 50, height: 70 },
  { name: '52x72', width: 52, height: 72 },
  { name: '70x100', width: 70, height: 100 },
  { name: '72x102', width: 72, height: 102 },
];

export interface OptimalFormat {
  format: SheetFormat;
  bocas: number;
  efficiency: number;
  orientation: 'normal' | 'rotated';
}

/**
 * Calculate optimal sheet format and bocas (products per sheet)
 */
export function calculateOptimalSheetFormat(
  productWidth: number,
  productHeight: number
): OptimalFormat[] {
  const margin = 0.5; // cm cutting margin
  
  const results = SHEET_FORMATS.map(format => {
    // Try normal orientation
    const bocasWidthNormal = Math.floor(format.width / (productWidth + margin));
    const bocasHeightNormal = Math.floor(format.height / (productHeight + margin));
    const bocasNormal = bocasWidthNormal * bocasHeightNormal;
    
    // Try rotated orientation
    const bocasWidthRotated = Math.floor(format.width / (productHeight + margin));
    const bocasHeightRotated = Math.floor(format.height / (productWidth + margin));
    const bocasRotated = bocasWidthRotated * bocasHeightRotated;
    
    // Use best orientation
    const bocas = Math.max(bocasNormal, bocasRotated);
    const orientation: 'normal' | 'rotated' = bocasNormal >= bocasRotated ? 'normal' : 'rotated';
    
    // Calculate efficiency (% of sheet used)
    const productArea = (productWidth + margin) * (productHeight + margin);
    const sheetArea = format.width * format.height;
    const efficiency = (bocas * productArea) / sheetArea * 100;
    
    return {
      format,
      bocas,
      efficiency: Math.round(efficiency * 100) / 100,
      orientation
    };
  });
  
  // Sort by efficiency (best first)
  return results
    .filter(r => r.bocas > 0)
    .sort((a, b) => b.efficiency - a.efficiency);
}

// ============================================
// SUBSTRATE CALCULATIONS
// ============================================

export interface SubstrateResult {
  bocasPerSheet: number;
  theoreticalSheets: number;
  wasteSheets: number;
  setupSheets: number;
  totalSheets: number;
  weightKg: number;
  efficiency: number;
  sheetFormat: string;
}

/**
 * Calculate substrate requirements
 */
export function calculateSubstrate(
  productWidth: number,
  productHeight: number,
  quantity: number,
  sheetFormatName: string,
  gsm: number,
  wastePercent: number = 7
): SubstrateResult {
  // Find the format
  const format = SHEET_FORMATS.find(f => f.name === sheetFormatName);
  if (!format) throw new Error('Invalid sheet format');
  
  // Calculate bocas
  const optimal = calculateOptimalSheetFormat(productWidth, productHeight);
  const formatResult = optimal.find(o => o.format.name === sheetFormatName);
  const bocasPerSheet = formatResult?.bocas || 1;
  const efficiency = formatResult?.efficiency || 0;
  
  // Calculate sheets
  const setupSheets = 50; // Standard setup/makeready waste
  const theoreticalSheets = Math.ceil(quantity / bocasPerSheet);
  const wasteSheets = Math.ceil(theoreticalSheets * (wastePercent / 100));
  const totalSheets = theoreticalSheets + wasteSheets + setupSheets;
  
  // Calculate weight
  const sheetAreaM2 = (format.width / 100) * (format.height / 100);
  const weightKg = totalSheets * sheetAreaM2 * (gsm / 1000);
  
  return {
    bocasPerSheet,
    theoreticalSheets,
    wasteSheets,
    setupSheets,
    totalSheets,
    weightKg: Math.round(weightKg * 100) / 100,
    efficiency,
    sheetFormat: format.name
  };
}

// ============================================
// INK CALCULATIONS
// ============================================

export interface InkResult {
  color: string;
  coveragePercent: number;
  kgPerColor: number;
}

/**
 * Calculate ink consumption
 */
export function calculateInk(
  sheetWidth: number,
  sheetHeight: number,
  totalSheets: number,
  colorsConfig: string // e.g., "4/4" = CMYK both sides
): { inks: InkResult[]; totalKg: number } {
  const sheetAreaM2 = (sheetWidth / 100) * (sheetHeight / 100);
  
  // Parse colors (e.g., "4/4" = 4 front + 4 back = 8 CMYK instances)
  const [front, back] = colorsConfig.split('/').map(Number);
  const totalColorInstances = (front || 0) + (back || 0);
  
  // Typical coverage for each CMYK color
  const coveragePercent = 25; // 25% coverage per color
  const inkDensity = 1.2; // g/cm³
  
  // Calculate kg per color
  const kgPerColor = (
    sheetAreaM2 * 10000 * // Convert to cm²
    (coveragePercent / 100) *
    inkDensity *
    totalSheets
  ) / 1000000; // Convert g to kg
  
  const colorNames = ['Cyan', 'Magenta', 'Yellow', 'Black'];
  const inks: InkResult[] = [];
  
  for (let i = 0; i < Math.min(totalColorInstances, 4); i++) {
    inks.push({
      color: colorNames[i % 4],
      coveragePercent,
      kgPerColor: Math.round(kgPerColor * 100) / 100
    });
  }
  
  const totalKg = inks.reduce((sum, ink) => sum + ink.kgPerColor, 0);
  
  return {
    inks,
    totalKg: Math.round(totalKg * 100) / 100
  };
}

// ============================================
// CTP PLATES CALCULATION
// ============================================

/**
 * Calculate CTP plates needed
 */
export function calculateCTPPlates(
  colorsConfig: string, // e.g., "4/4"
  extraPlates: number = 2 // Backup plates
): number {
  const [front, back] = colorsConfig.split('/').map(Number);
  const totalColors = (front || 0) + (back || 0);
  return totalColors + extraPlates;
}

// ============================================
// PRINTING HOURS CALCULATION
// ============================================

export interface PrintingHoursResult {
  setupTimeHours: number;
  printingTimeHours: number;
  totalTimeHours: number;
  sheetsPerHour: number;
}

/**
 * Calculate estimated printing hours
 */
export function calculatePrintingHours(
  totalSheets: number,
  sheetsPerHour: number = 10000,
  setupMinutes: number = 30,
  colorsConfig: string = "4/0"
): PrintingHoursResult {
  const [front, back] = colorsConfig.split('/').map(Number);
  const passes = (front > 0 ? 1 : 0) + (back > 0 ? 1 : 0);
  
  const setupTimeHours = (setupMinutes * passes) / 60;
  const printingTimeHours = (totalSheets * passes) / sheetsPerHour;
  const totalTimeHours = setupTimeHours + printingTimeHours;
  
  return {
    setupTimeHours: Math.round(setupTimeHours * 100) / 100,
    printingTimeHours: Math.round(printingTimeHours * 100) / 100,
    totalTimeHours: Math.round(totalTimeHours * 100) / 100,
    sheetsPerHour
  };
}

// ============================================
// PRICING CALCULATIONS
// ============================================

export interface PricingResult {
  subtotal: number;
  basePrice: number;
  withIncrement: number;
  withCommissions: number;
  finalTotal: number;
  unitPrice: number;
}

/**
 * Calculate final pricing with margins
 */
export function calculatePricing(
  subtotal: number,
  quantity: number,
  baseMarginPercent: number = 10,
  incrementPercent: number = 10,
  commission1Percent: number = 1,
  commission2Percent: number = 0,
  commission3Percent: number = 0
): PricingResult {
  const basePrice = subtotal * (1 + baseMarginPercent / 100);
  const withIncrement = basePrice * (1 + incrementPercent / 100);
  const withComm1 = withIncrement * (1 + commission1Percent / 100);
  const withComm2 = withComm1 * (1 + commission2Percent / 100);
  const finalTotal = withComm2 * (1 + commission3Percent / 100);
  const unitPrice = finalTotal / quantity;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    basePrice: Math.round(basePrice * 100) / 100,
    withIncrement: Math.round(withIncrement * 100) / 100,
    withCommissions: Math.round(withComm1 * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    unitPrice: Math.round(unitPrice * 100) / 100
  };
}

// ============================================
// COST CALCULATIONS
// ============================================

export interface OperationCost {
  code: string;
  name: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unitOfMeasure: string;
}

export interface CostBreakdown {
  materials: OperationCost[];
  printing: OperationCost[];
  finishing: OperationCost[];
  services: OperationCost[];
  subtotal: number;
  materialsCost: number;
  printingCost: number;
  finishingCost: number;
  servicesCost: number;
}

/**
 * Calculate all costs for a work order
 */
export function calculateCostBreakdown(operations: OperationCost[]): CostBreakdown {
  const materials = operations.filter(op => op.category === 'MATERIALS');
  const printing = operations.filter(op => op.category === 'PRINTING');
  const finishing = operations.filter(op => op.category === 'FINISHING');
  const services = operations.filter(op => op.category === 'SERVICES');
  
  const materialsCost = materials.reduce((sum, op) => sum + op.totalCost, 0);
  const printingCost = printing.reduce((sum, op) => sum + op.totalCost, 0);
  const finishingCost = finishing.reduce((sum, op) => sum + op.totalCost, 0);
  const servicesCost = services.reduce((sum, op) => sum + op.totalCost, 0);
  const subtotal = materialsCost + printingCost + finishingCost + servicesCost;
  
  return {
    materials,
    printing,
    finishing,
    services,
    subtotal,
    materialsCost,
    printingCost,
    finishingCost,
    servicesCost
  };
}

// ============================================
// COMPLETE OT CALCULATION
// ============================================

export interface CompleteOTResult {
  sheetFormat: string;
  substrate: SubstrateResult;
  ink: { inks: InkResult[]; totalKg: number };
  ctpPlates: number;
  printingHours: PrintingHoursResult;
  alternativeFormats: OptimalFormat[];
}

/**
 * Calculate all aspects of an OT
 */
export function calculateCompleteOT(input: {
  productWidth: number;
  productHeight: number;
  quantity: number;
  substrateGsm: number;
  colorsConfig: string;
  wastePercent?: number;
  sheetFormat?: string;
  sheetsPerHour?: number;
}): CompleteOTResult {
  // 1. Optimize sheet format (if not specified)
  const optimal = calculateOptimalSheetFormat(input.productWidth, input.productHeight);
  const selectedFormat = input.sheetFormat || optimal[0]?.format.name || '70x100';
  
  // 2. Calculate substrate
  const substrate = calculateSubstrate(
    input.productWidth,
    input.productHeight,
    input.quantity,
    selectedFormat,
    input.substrateGsm,
    input.wastePercent
  );
  
  // 3. Calculate ink
  const format = SHEET_FORMATS.find(f => f.name === selectedFormat)!;
  const ink = calculateInk(
    format.width,
    format.height,
    substrate.totalSheets,
    input.colorsConfig
  );
  
  // 4. Calculate CTP plates
  const ctpPlates = calculateCTPPlates(input.colorsConfig);
  
  // 5. Calculate printing hours
  const printingHours = calculatePrintingHours(
    substrate.totalSheets,
    input.sheetsPerHour || 10000,
    30,
    input.colorsConfig
  );
  
  return {
    sheetFormat: selectedFormat,
    substrate,
    ink,
    ctpPlates,
    printingHours,
    alternativeFormats: optimal.slice(0, 3) // Top 3 alternatives
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency in Chilean pesos
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CL", { 
    style: "currency", 
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Calculate efficiency percentage
 */
export function calculateEfficiency(actual: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.round((actual / expected) * 100);
}

/**
 * Calculate OEE (Overall Equipment Effectiveness)
 */
export function calculateOEE(
  availability: number, // 0-100
  performance: number,  // 0-100
  quality: number       // 0-100
): number {
  return Math.round((availability * performance * quality) / 10000);
}
