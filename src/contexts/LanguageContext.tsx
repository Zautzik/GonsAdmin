import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'es';

interface Translations {
  [key: string]: {
    en: string;
    es: string;
  };
}

const translations: Translations = {
  // Auth
  login: { en: 'Login', es: 'Iniciar sesión' },
  email: { en: 'Email', es: 'Correo electrónico' },
  password: { en: 'Password', es: 'Contraseña' },
  logout: { en: 'Logout', es: 'Cerrar sesión' },
  
  // Dashboards
  supervisorDashboard: { en: 'Supervisor Dashboard', es: 'Panel de Supervisor' },
  managerDashboard: { en: 'Manager Dashboard', es: 'Panel de Gerente' },
  machines: { en: 'Machines', es: 'Máquinas' },
  jobs: { en: 'Jobs', es: 'Trabajos' },
  reports: { en: 'Reports', es: 'Reportes' },
  
  // Machine statuses
  idle: { en: 'Idle', es: 'Inactivo' },
  running: { en: 'Running', es: 'En ejecución' },
  maintenance: { en: 'Maintenance', es: 'Mantenimiento' },
  offline: { en: 'Offline', es: 'Fuera de línea' },
  
  // Job statuses
  pending: { en: 'Pending', es: 'Pendiente' },
  in_progress: { en: 'In Progress', es: 'En progreso' },
  completed: { en: 'Completed', es: 'Completado' },
  delivered: { en: 'Delivered', es: 'Entregado' },
  
  // Machine types
  offset_printer: { en: 'Offset Printer', es: 'Impresora Offset' },
  die_cutter: { en: 'Die Cutter', es: 'Troqueladora' },
  guillotine: { en: 'Guillotine', es: 'Guillotina' },
  digital_printer: { en: 'Digital Printer', es: 'Impresora Digital' },
  pre_press: { en: 'Pre-Press', es: 'Pre-Impresión' },
  manual_workshop: { en: 'Manual Workshop', es: 'Taller Manual' },
  delivery: { en: 'Delivery', es: 'Entrega' },
  
  // Actions
  addJob: { en: 'Add Job', es: 'Agregar Trabajo' },
  updateStatus: { en: 'Update Status', es: 'Actualizar Estado' },
  description: { en: 'Description', es: 'Descripción' },
  status: { en: 'Status', es: 'Estado' },
  machine: { en: 'Machine', es: 'Máquina' },
  createdAt: { en: 'Created At', es: 'Creado el' },
  submit: { en: 'Submit', es: 'Enviar' },
  cancel: { en: 'Cancel', es: 'Cancelar' },
  
  // Reports
  totalJobs: { en: 'Total Jobs', es: 'Total de Trabajos' },
  completedJobs: { en: 'Completed Jobs', es: 'Trabajos Completados' },
  pendingJobs: { en: 'Pending Jobs', es: 'Trabajos Pendientes' },
  efficiency: { en: 'Efficiency', es: 'Eficiencia' },
  jobsPerDay: { en: 'Jobs per Day', es: 'Trabajos por día' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};