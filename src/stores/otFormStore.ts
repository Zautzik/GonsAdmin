import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface JobInfo {
  clientId: string;
  clientName: string;
  productName: string;
  productDescription: string;
  quantity: number;
  deliveryDate: string;
  budgetCode: string;
  priority: number;
  salesRepId: string;
  notes: string;
}

export interface Specifications {
  productType: string;
  finishedWidthCm: number;
  finishedHeightCm: number;
  substrateType: string;
  substrateWeightGsm: number;
  substrateBrand: string;
  colorsFront: number;
  colorsBack: number;
  pantoneColors: string[];
  finishingOperations: string[];
  packagingNotes: string;
}

export interface Calculations {
  sheetFormat: string;
  sheetWidthCm: number;
  sheetHeightCm: number;
  bocasPerSheet: number;
  totalSheets: number;
  setupSheets: number;
  substrateKg: number;
  wasteFactorPercent: number;
  inkCalculations: {
    totalKg: number;
    perColor: Record<string, number>;
  };
  ctpPlates: number;
  impositionLayout: {
    rows: number;
    cols: number;
    efficiency: number;
  };
  printingHoursEstimated: number;
  finishingHoursEstimated: number;
}

export interface Operation {
  id: string;
  operationCode: string;
  name: string;
  category: string;
  sequenceOrder: number;
  quantityBudgeted: number;
  unitCostBudgeted: number;
  totalCostBudgeted: number;
  unitOfMeasure: string;
  notes: string;
}

export interface Pricing {
  materialsCost: number;
  laborCost: number;
  thirdPartyCost: number;
  otherCost: number;
  subtotal: number;
  marginPercent: number;
  marginAmount: number;
  incrementPercent: number;
  incrementAmount: number;
  commission1Percent: number;
  commission1Amount: number;
  commission2Percent: number;
  commission2Amount: number;
  commission3Percent: number;
  commission3Amount: number;
  totalPrice: number;
  unitPrice: number;
}

interface OTFormState {
  currentStep: number;
  workOrderId: string | null;
  jobInfo: JobInfo;
  specifications: Specifications;
  calculations: Calculations;
  operations: Operation[];
  pricing: Pricing;
  isDirty: boolean;
  lastSaved: Date | null;
  
  // Actions
  setCurrentStep: (step: number) => void;
  setWorkOrderId: (id: string) => void;
  setJobInfo: (data: Partial<JobInfo>) => void;
  setSpecifications: (data: Partial<Specifications>) => void;
  setCalculations: (data: Partial<Calculations>) => void;
  setOperations: (operations: Operation[]) => void;
  addOperation: (operation: Operation) => void;
  updateOperation: (id: string, data: Partial<Operation>) => void;
  removeOperation: (id: string) => void;
  reorderOperations: (startIndex: number, endIndex: number) => void;
  setPricing: (data: Partial<Pricing>) => void;
  calculatePricing: () => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (date: Date) => void;
  resetForm: () => void;
}

const initialJobInfo: JobInfo = {
  clientId: '',
  clientName: '',
  productName: '',
  productDescription: '',
  quantity: 1000,
  deliveryDate: '',
  budgetCode: '',
  priority: 3,
  salesRepId: '',
  notes: '',
};

const initialSpecifications: Specifications = {
  productType: '',
  finishedWidthCm: 0,
  finishedHeightCm: 0,
  substrateType: 'Couche',
  substrateWeightGsm: 150,
  substrateBrand: '',
  colorsFront: 4,
  colorsBack: 0,
  pantoneColors: [],
  finishingOperations: [],
  packagingNotes: '',
};

const initialCalculations: Calculations = {
  sheetFormat: '50x70',
  sheetWidthCm: 50,
  sheetHeightCm: 70,
  bocasPerSheet: 1,
  totalSheets: 0,
  setupSheets: 500,
  substrateKg: 0,
  wasteFactorPercent: 5,
  inkCalculations: { totalKg: 0, perColor: {} },
  ctpPlates: 0,
  impositionLayout: { rows: 1, cols: 1, efficiency: 0 },
  printingHoursEstimated: 0,
  finishingHoursEstimated: 0,
};

const initialPricing: Pricing = {
  materialsCost: 0,
  laborCost: 0,
  thirdPartyCost: 0,
  otherCost: 0,
  subtotal: 0,
  marginPercent: 10,
  marginAmount: 0,
  incrementPercent: 10,
  incrementAmount: 0,
  commission1Percent: 1,
  commission1Amount: 0,
  commission2Percent: 0,
  commission2Amount: 0,
  commission3Percent: 0,
  commission3Amount: 0,
  totalPrice: 0,
  unitPrice: 0,
};

export const useOTFormStore = create<OTFormState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      workOrderId: null,
      jobInfo: initialJobInfo,
      specifications: initialSpecifications,
      calculations: initialCalculations,
      operations: [],
      pricing: initialPricing,
      isDirty: false,
      lastSaved: null,

      setCurrentStep: (step) => set({ currentStep: step }),
      
      setWorkOrderId: (id) => set({ workOrderId: id }),
      
      setJobInfo: (data) => set((state) => ({
        jobInfo: { ...state.jobInfo, ...data },
        isDirty: true,
      })),
      
      setSpecifications: (data) => set((state) => ({
        specifications: { ...state.specifications, ...data },
        isDirty: true,
      })),
      
      setCalculations: (data) => set((state) => ({
        calculations: { ...state.calculations, ...data },
        isDirty: true,
      })),
      
      setOperations: (operations) => set({ operations, isDirty: true }),
      
      addOperation: (operation) => set((state) => ({
        operations: [...state.operations, operation],
        isDirty: true,
      })),
      
      updateOperation: (id, data) => set((state) => ({
        operations: state.operations.map((op) =>
          op.id === id ? { ...op, ...data, totalCostBudgeted: (data.quantityBudgeted ?? op.quantityBudgeted) * (data.unitCostBudgeted ?? op.unitCostBudgeted) } : op
        ),
        isDirty: true,
      })),
      
      removeOperation: (id) => set((state) => ({
        operations: state.operations.filter((op) => op.id !== id),
        isDirty: true,
      })),
      
      reorderOperations: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.operations);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return {
          operations: result.map((op, idx) => ({ ...op, sequenceOrder: idx + 1 })),
          isDirty: true,
        };
      }),
      
      setPricing: (data) => set((state) => ({
        pricing: { ...state.pricing, ...data },
        isDirty: true,
      })),
      
      calculatePricing: () => set((state) => {
        const ops = state.operations;
        
        const materialsCost = ops
          .filter((op) => op.category === 'MATERIALS')
          .reduce((sum, op) => sum + op.totalCostBudgeted, 0);
        
        const laborCost = ops
          .filter((op) => ['PREPRESS', 'PRINTING', 'FINISHING'].includes(op.category))
          .reduce((sum, op) => sum + op.totalCostBudgeted, 0);
        
        const thirdPartyCost = ops
          .filter((op) => op.category === 'THIRD_PARTY')
          .reduce((sum, op) => sum + op.totalCostBudgeted, 0);
        
        const otherCost = ops
          .filter((op) => op.category === 'OTHER')
          .reduce((sum, op) => sum + op.totalCostBudgeted, 0);
        
        const subtotal = materialsCost + laborCost + thirdPartyCost + otherCost;
        
        const { marginPercent, incrementPercent, commission1Percent, commission2Percent, commission3Percent } = state.pricing;
        
        const marginAmount = subtotal * (marginPercent / 100);
        const afterMargin = subtotal + marginAmount;
        
        const incrementAmount = afterMargin * (incrementPercent / 100);
        const afterIncrement = afterMargin + incrementAmount;
        
        const commission1Amount = afterIncrement * (commission1Percent / 100);
        const commission2Amount = afterIncrement * (commission2Percent / 100);
        const commission3Amount = afterIncrement * (commission3Percent / 100);
        
        const totalPrice = afterIncrement + commission1Amount + commission2Amount + commission3Amount;
        const unitPrice = state.jobInfo.quantity > 0 ? totalPrice / state.jobInfo.quantity : 0;
        
        return {
          pricing: {
            ...state.pricing,
            materialsCost,
            laborCost,
            thirdPartyCost,
            otherCost,
            subtotal,
            marginAmount,
            incrementAmount,
            commission1Amount,
            commission2Amount,
            commission3Amount,
            totalPrice,
            unitPrice,
          },
        };
      }),
      
      setDirty: (dirty) => set({ isDirty: dirty }),
      
      setLastSaved: (date) => set({ lastSaved: date, isDirty: false }),
      
      resetForm: () => set({
        currentStep: 1,
        workOrderId: null,
        jobInfo: initialJobInfo,
        specifications: initialSpecifications,
        calculations: initialCalculations,
        operations: [],
        pricing: initialPricing,
        isDirty: false,
        lastSaved: null,
      }),
    }),
    {
      name: 'ot-form-storage',
      partialize: (state) => ({
        currentStep: state.currentStep,
        workOrderId: state.workOrderId,
        jobInfo: state.jobInfo,
        specifications: state.specifications,
        calculations: state.calculations,
        operations: state.operations,
        pricing: state.pricing,
      }),
    }
  )
);
