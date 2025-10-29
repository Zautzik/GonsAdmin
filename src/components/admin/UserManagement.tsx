import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserManagementProps {
  onUpdate: () => void;
}

const UserManagement = ({ onUpdate }: UserManagementProps) => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'supervisor' as any,
    department: '',
    manager_domain: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*, email:user_id');
    
    if (error) {
      toast.error('Error loading users');
    } else {
      setUsers(data || []);
    }
  };

  const handleSubmit = async () => {
    if (editingUser) {
      // Update existing user role
      const { error } = await supabase
        .from('user_roles')
        .update({
          role: formData.role,
          department: formData.department || null,
          manager_domain: formData.manager_domain || null,
        })
        .eq('id', editingUser.id);

      if (error) {
        toast.error('Error updating user');
      } else {
        toast.success('User updated successfully');
        fetchUsers();
        onUpdate();
        resetForm();
      }
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      if (authData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: formData.role,
            department: formData.department || null,
            manager_domain: formData.manager_domain || null,
          } as any);

        if (roleError) {
          toast.error('Error creating user role');
        } else {
          toast.success('User created successfully');
          fetchUsers();
          onUpdate();
          resetForm();
        }
      }
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userId);

    if (error) {
      toast.error('Error deleting user');
    } else {
      toast.success('User deleted successfully');
      fetchUsers();
      onUpdate();
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'supervisor',
      department: '',
      manager_domain: '',
    });
    setEditingUser(null);
    setShowDialog(false);
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setFormData({
      email: '',
      password: '',
      role: user.role,
      department: user.department || '',
      manager_domain: user.manager_domain || '',
    });
    setShowDialog(true);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-primary">{t('userManagement')}</CardTitle>
        <Button onClick={() => setShowDialog(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          {t('addUser')}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('department')}</TableHead>
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.user_id}</TableCell>
                <TableCell>{t(user.role)}</TableCell>
                <TableCell>{user.department ? t(user.department) : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t('editUser') : t('addUser')}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? t('editUserDescription') : t('addUserDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">{t('role')}</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                  <SelectItem value="manager">{t('manager')}</SelectItem>
                  <SelectItem value="supervisor">{t('supervisor')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.role === 'supervisor' || formData.role === 'manager') && (
              <div className="space-y-2">
                <Label htmlFor="department">{t('department')}</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="press">{t('press')}</SelectItem>
                    <SelectItem value="manual_workshop">{t('manual_workshop')}</SelectItem>
                    <SelectItem value="deliveries">{t('deliveries')}</SelectItem>
                    <SelectItem value="pre_press">{t('pre_press')}</SelectItem>
                    <SelectItem value="administration">{t('administration')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role === 'manager' && (
              <div className="space-y-2">
                <Label htmlFor="manager_domain">{t('managerDomain')}</Label>
                <Select value={formData.manager_domain} onValueChange={(value) => setFormData({ ...formData, manager_domain: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost">{t('cost')}</SelectItem>
                    <SelectItem value="efficiency">{t('efficiency')}</SelectItem>
                    <SelectItem value="production">{t('production')}</SelectItem>
                    <SelectItem value="quality">{t('quality')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
              {editingUser ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserManagement;
