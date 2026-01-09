import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOTFormStore } from '@/stores/otFormStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Search, FileText, Copy, Edit, Trash2, 
  Package, Bookmark, ArrowRight, Eye, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description: string | null;
  product_type: string | null;
  specifications: any;
  operations: any[];
  use_count: number;
  created_at: string;
}

export default function OTTemplates() {
  const navigate = useNavigate();
  const { setSpecifications, setOperations, resetForm } = useOTFormStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ot_templates')
      .select('*')
      .order('use_count', { ascending: false });
    
    if (!error && data) {
      setTemplates(data.map(t => ({
        ...t,
        operations: (t.operations as any[]) || [],
      })));
    }
    setLoading(false);
  };

  const handleUseTemplate = async (template: Template) => {
    resetForm();
    
    // Set specifications from template
    if (template.specifications) {
      setSpecifications({
        productType: template.product_type || '',
        finishedWidthCm: template.specifications.finishedWidthCm || 0,
        finishedHeightCm: template.specifications.finishedHeightCm || 0,
        substrateType: template.specifications.substrateType || 'Couche',
        substrateWeightGsm: template.specifications.substrateWeightGsm || 150,
        colorsFront: template.specifications.colorsFront || 4,
        colorsBack: template.specifications.colorsBack || 0,
        finishingOperations: template.specifications.finishingOperations || [],
      });
    }

    // Increment use count
    await supabase
      .from('ot_templates')
      .update({ use_count: template.use_count + 1 })
      .eq('id', template.id);

    toast({ title: 'Plantilla aplicada', description: `Usando plantilla: ${template.name}` });
    navigate('/ots/create');
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const { error } = await supabase.from('ot_templates').delete().eq('id', templateId);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Plantilla eliminada' });
      fetchTemplates();
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesType = typeFilter === 'all' || template.product_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const productTypes = [...new Set(templates.map(t => t.product_type).filter(Boolean))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Plantillas de OT</h1>
          <p className="text-muted-foreground">Crea OTs rápidamente usando plantillas</p>
        </div>
        <Button onClick={() => navigate('/ots/create')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva OT
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Plantillas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.reduce((sum, t) => sum + t.use_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Usos Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{productTypes.length}</p>
                <p className="text-xs text-muted-foreground">Tipos Producto</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {templates.length > 0 ? Math.max(...templates.map(t => t.use_count)) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Más Usada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plantillas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {productTypes.map((type) => (
                  <SelectItem key={type} value={type!}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                <div className="h-6 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || typeFilter !== 'all'
                ? 'No se encontraron plantillas con los filtros seleccionados'
                : 'Crea una OT y guárdala como plantilla para reutilizarla'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="card-hover group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    {template.product_type && (
                      <Badge variant="secondary" className="text-xs mb-2">
                        {template.product_type}
                      </Badge>
                    )}
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {template.use_count} usos
                  </Badge>
                </div>
                {template.description && (
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Specs Preview */}
                {template.specifications && (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensiones</span>
                      <span>{template.specifications.finishedWidthCm}×{template.specifications.finishedHeightCm} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sustrato</span>
                      <span>{template.specifications.substrateType} {template.specifications.substrateWeightGsm}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Colores</span>
                      <span>{template.specifications.colorsFront}/{template.specifications.colorsBack}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Copy className="h-4 w-4" /> Usar Plantilla
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.description && (
                <p className="text-muted-foreground">{selectedTemplate.description}</p>
              )}
              
              <div className="space-y-2">
                <h4 className="font-medium">Especificaciones</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Dimensiones</span>
                    <span className="font-medium">{selectedTemplate.specifications?.finishedWidthCm}×{selectedTemplate.specifications?.finishedHeightCm} cm</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Sustrato</span>
                    <span className="font-medium">{selectedTemplate.specifications?.substrateType}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Gramaje</span>
                    <span className="font-medium">{selectedTemplate.specifications?.substrateWeightGsm}g</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span>Colores</span>
                    <span className="font-medium">{selectedTemplate.specifications?.colorsFront}/{selectedTemplate.specifications?.colorsBack}</span>
                  </div>
                </div>
              </div>

              {selectedTemplate.specifications?.finishingOperations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Terminaciones</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.specifications.finishingOperations.map((op: string) => (
                      <Badge key={op} variant="secondary">{op}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.operations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Operaciones Incluidas</h4>
                  <div className="text-sm space-y-1">
                    {selectedTemplate.operations.map((op: any, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">{op.code}</Badge>
                        <span>{op.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cerrar</Button>
            <Button onClick={() => {
              if (selectedTemplate) {
                handleUseTemplate(selectedTemplate);
                setShowPreview(false);
              }
            }} className="gap-2">
              <Copy className="h-4 w-4" /> Usar Esta Plantilla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}