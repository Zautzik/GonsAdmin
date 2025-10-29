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
  adminDashboard: { en: 'Admin Dashboard', es: 'Panel de Administrador' },
  machines: { en: 'Machines', es: 'Máquinas' },
  jobs: { en: 'Jobs', es: 'Trabajos' },
  reports: { en: 'Reports', es: 'Reportes' },
  users: { en: 'Users', es: 'Usuarios' },
  workers: { en: 'Workers', es: 'Trabajadores' },
  inventory: { en: 'Inventory', es: 'Inventario' },
  purchases: { en: 'Purchases', es: 'Compras' },
  totalUsers: { en: 'Total Users', es: 'Total de Usuarios' },
  totalWorkers: { en: 'Total Workers', es: 'Total de Trabajadores' },
  userManagement: { en: 'User Management', es: 'Gestión de Usuarios' },
  workersManagement: { en: 'Workers Management', es: 'Gestión de Trabajadores' },
  inventoryManagement: { en: 'Inventory Management', es: 'Gestión de Inventario' },
  purchasesManagement: { en: 'Purchases Management', es: 'Gestión de Compras' },
  addUser: { en: 'Add User', es: 'Agregar Usuario' },
  addWorker: { en: 'Add Worker', es: 'Agregar Trabajador' },
  addItem: { en: 'Add Item', es: 'Agregar Artículo' },
  addPurchase: { en: 'Add Purchase', es: 'Agregar Compra' },
  editUser: { en: 'Edit User', es: 'Editar Usuario' },
  editWorker: { en: 'Edit Worker', es: 'Editar Trabajador' },
  editItem: { en: 'Edit Item', es: 'Editar Artículo' },
  editPurchase: { en: 'Edit Purchase', es: 'Editar Compra' },
  role: { en: 'Role', es: 'Rol' },
  department: { en: 'Department', es: 'Departamento' },
  name: { en: 'Name', es: 'Nombre' },
  actions: { en: 'Actions', es: 'Acciones' },
  itemName: { en: 'Item Name', es: 'Nombre del Artículo' },
  quantity: { en: 'Quantity', es: 'Cantidad' },
  costPerUnit: { en: 'Cost per Unit', es: 'Costo por Unidad' },
  supplier: { en: 'Supplier', es: 'Proveedor' },
  date: { en: 'Date', es: 'Fecha' },
  totalCost: { en: 'Total Cost', es: 'Costo Total' },
  certificationDetails: { en: 'Certification Details', es: 'Detalles de Certificación' },
  confirmDelete: { en: 'Are you sure you want to delete this?', es: '¿Estás seguro de que deseas eliminar esto?' },
  create: { en: 'Create', es: 'Crear' },
  update: { en: 'Update', es: 'Actualizar' },
  admin: { en: 'Admin', es: 'Administrador' },
  manager: { en: 'Manager', es: 'Gerente' },
  supervisor: { en: 'Supervisor', es: 'Supervisor' },
  press: { en: 'Press', es: 'Prensa' },
  deliveries: { en: 'Deliveries', es: 'Entregas' },
  administration: { en: 'Administration', es: 'Administración' },
  managerDomain: { en: 'Manager Domain', es: 'Dominio del Gerente' },
  cost: { en: 'Cost', es: 'Costos' },
  production: { en: 'Production', es: 'Producción' },
  quality: { en: 'Quality', es: 'Calidad' },
  addUserDescription: { en: 'Create a new user with role and department', es: 'Crear un nuevo usuario con su rol y departamento' },
  editUserDescription: { en: 'Modify user role and department', es: 'Modificar el rol y departamento del usuario' },
  addWorkerDescription: { en: 'Add a new worker to the system', es: 'Agregar un nuevo trabajador al sistema' },
  editWorkerDescription: { en: 'Modify worker information', es: 'Modificar la información del trabajador' },
  addItemDescription: { en: 'Add a new item to inventory', es: 'Agregar un nuevo artículo al inventario' },
  editItemDescription: { en: 'Modify item information', es: 'Modificar la información del artículo' },
  addPurchaseDescription: { en: 'Register a new purchase', es: 'Registrar una nueva compra' },
  editPurchaseDescription: { en: 'Modify purchase details', es: 'Modificar los detalles de la compra' },
  
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