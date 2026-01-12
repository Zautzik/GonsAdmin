import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Rate limiting map (in-memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ================== HELPER FUNCTIONS ==================

// Check rate limit
function checkRateLimit(phoneNumber: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(phoneNumber);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(phoneNumber, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Send WhatsApp message via Twilio
async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.error('Twilio credentials not configured');
    return false;
  }
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  // Ensure 'to' has the whatsapp: prefix
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  
  const formData = new URLSearchParams();
  formData.append('From', `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
  formData.append('To', formattedTo);
  formData.append('Body', message);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio error:', errorText);
      return false;
    }
    
    console.log('WhatsApp message sent successfully to', formattedTo);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return false;
  }
}

// Parse production report message
interface ProductionReport {
  otNumber: string | null;
  units: number;
  timeMinutes: number;
  timeHours: number;
}

function parseProductionReport(message: string): ProductionReport {
  const normalizedMsg = message.toLowerCase();
  
  // Extract OT number - various formats
  // "OT 39845", "OT39845", "OT-39845", "OT#39845"
  const otMatch = message.match(/OT[-\s#]?(\d{4,6})/i);
  const otNumber = otMatch ? otMatch[1] : null;
  
  // Extract units - various formats
  // "producido 1500", "1500 unidades", "qty:1500", "1500 hojas"
  let units = 0;
  const unitPatterns = [
    /(?:producido|produccion|produced)\s+(\d+)/i,
    /(\d+)\s*(?:unidades?|units?|hojas?|sheets?|pliegos?|pzas?)/i,
    /qty[:\s]*(\d+)/i,
    /cantidad[:\s]*(\d+)/i,
  ];
  
  for (const pattern of unitPatterns) {
    const match = message.match(pattern);
    if (match) {
      units = parseInt(match[1]);
      break;
    }
  }
  
  // If no pattern matched, try to find standalone numbers after OT
  if (units === 0 && otNumber) {
    const afterOT = message.substring(message.toLowerCase().indexOf('ot') + 7);
    const numMatch = afterOT.match(/(\d+)/);
    if (numMatch) {
      units = parseInt(numMatch[1]);
    }
  }
  
  // Extract time - various formats
  // "tiempo 2h 30m", "2.5 horas", "time:150", "150 minutos"
  let timeMinutes = 0;
  
  // Hours and minutes combined: "2h 30m", "2h30min"
  const hoursMinutesMatch = message.match(/(\d+)\s*h(?:oras?)?\s*(\d+)\s*m(?:in(?:utos?)?)?/i);
  if (hoursMinutesMatch) {
    timeMinutes = parseInt(hoursMinutesMatch[1]) * 60 + parseInt(hoursMinutesMatch[2]);
  } else {
    // Just hours: "2.5 horas", "2h"
    const hoursMatch = message.match(/(\d+(?:[.,]\d+)?)\s*(?:h(?:oras?)?|hrs?)/i);
    if (hoursMatch) {
      timeMinutes = Math.round(parseFloat(hoursMatch[1].replace(',', '.')) * 60);
    }
    
    // Just minutes: "150 minutos", "time:150"
    const minutesMatch = message.match(/(?:time[:\s]*)?(\d+)\s*(?:min(?:utos?)?|m\b)/i);
    if (minutesMatch && !hoursMatch) {
      timeMinutes = parseInt(minutesMatch[1]);
    }
  }
  
  return {
    otNumber,
    units,
    timeMinutes,
    timeHours: Math.round((timeMinutes / 60) * 100) / 100,
  };
}

// Parse inventory action message
interface InventoryAction {
  action: 'receive' | 'usage' | 'query' | null;
  itemIdentifier: string | null;
  quantity: number;
  otNumber: string | null;
}

function parseInventoryAction(message: string): InventoryAction {
  const normalizedMsg = message.toLowerCase();
  
  let action: 'receive' | 'usage' | 'query' | null = null;
  
  if (normalizedMsg.includes('recepcion') || normalizedMsg.includes('recibido') || normalizedMsg.includes('ingreso')) {
    action = 'receive';
  } else if (normalizedMsg.includes('uso') || normalizedMsg.includes('consumo') || normalizedMsg.includes('gasto')) {
    action = 'usage';
  } else if (normalizedMsg.includes('stock') || normalizedMsg.includes('disponible') || normalizedMsg.includes('cuanto')) {
    action = 'query';
  }
  
  // Extract item identifier (SKU, barcode, or name)
  // Format: "[barcode/sku]" or after action keyword
  const skuMatch = message.match(/\[([^\]]+)\]/);
  const itemIdentifier = skuMatch ? skuMatch[1] : null;
  
  // Extract quantity
  const qtyMatch = message.match(/cantidad[:\s]*(\d+(?:[.,]\d+)?)/i) || 
                   message.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|lt|rollos?|unidades?|cajas?)/i);
  const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 0;
  
  // Extract OT if linked
  const otMatch = message.match(/OT[-\s#]?(\d{4,6})/i);
  const otNumber = otMatch ? otMatch[1] : null;
  
  return { action, itemIdentifier, quantity, otNumber };
}

// Format production summary
async function formatProductionSummary(supabase: any, workOrderId: string): Promise<string> {
  // Get work order details
  const { data: wo } = await supabase
    .from('work_orders')
    .select('ot_number, product_name, quantity, client_name')
    .eq('id', workOrderId)
    .single();
  
  if (!wo) return 'OT no encontrada';
  
  // Get production reports sum
  const { data: reports } = await supabase
    .from('production_reports')
    .select('units_produced, time_elapsed_minutes')
    .eq('work_order_id', workOrderId);
  
  const totalProduced = reports?.reduce((sum: number, r: any) => sum + (r.units_produced || 0), 0) || 0;
  const totalMinutes = reports?.reduce((sum: number, r: any) => sum + (r.time_elapsed_minutes || 0), 0) || 0;
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const progress = wo.quantity > 0 ? Math.round((totalProduced / wo.quantity) * 100) : 0;
  
  return `📊 OT #${wo.ot_number}\n` +
         `📦 ${wo.product_name}\n` +
         `👤 ${wo.client_name}\n` +
         `━━━━━━━━━━━━━━━\n` +
         `✅ Producido: ${totalProduced.toLocaleString()} / ${wo.quantity.toLocaleString()}\n` +
         `📈 Progreso: ${progress}%\n` +
         `⏱️ Tiempo total: ${totalHours}h\n` +
         `📉 Pendiente: ${(wo.quantity - totalProduced).toLocaleString()} unidades`;
}

// Detect message intent
function detectIntent(message: string): string {
  const normalizedMsg = message.toLowerCase().trim();
  
  // Production reporting
  if (normalizedMsg.startsWith('ot') || 
      normalizedMsg.includes('produccion') || 
      normalizedMsg.includes('reporte') ||
      normalizedMsg.includes('producido')) {
    return 'production';
  }
  
  // Issue reporting
  if (normalizedMsg.includes('problema') || 
      normalizedMsg.includes('issue') || 
      normalizedMsg.includes('parada') || 
      normalizedMsg.includes('falla') ||
      normalizedMsg.includes('error') ||
      normalizedMsg.includes('averia')) {
    return 'issue';
  }
  
  // Inventory
  if (normalizedMsg.includes('inventario') || 
      normalizedMsg.includes('recepcion') || 
      normalizedMsg.includes('uso ') ||
      normalizedMsg.includes('stock')) {
    return 'inventory';
  }
  
  // Help
  if (normalizedMsg === 'ayuda' || 
      normalizedMsg === 'help' || 
      normalizedMsg === 'comandos' ||
      normalizedMsg === '?') {
    return 'help';
  }
  
  // Status query
  if (normalizedMsg.startsWith('status') || 
      normalizedMsg.startsWith('estado')) {
    return 'status';
  }
  
  // Verification code
  if (/^\d{6}$/.test(normalizedMsg)) {
    return 'verification';
  }
  
  return 'unknown';
}

// Generate help message
function getHelpMessage(): string {
  return `🤖 *Bot de Producción GONSA*\n\n` +
         `📦 *REPORTAR PRODUCCIÓN:*\n` +
         `• OT 39845 producido 1500 tiempo 2h 30m\n` +
         `• OT 39845 1500 unidades 2.5 horas\n\n` +
         `⚠️ *REPORTAR PROBLEMA:*\n` +
         `• problema OT 39845 máquina parada\n` +
         `• falla OT 39845 sin papel\n\n` +
         `📦 *INVENTARIO:*\n` +
         `• recepcion [SKU123] cantidad 500kg\n` +
         `• uso [SKU123] OT 39845 cantidad 50kg\n` +
         `• stock [SKU123]\n\n` +
         `📊 *CONSULTAR ESTADO:*\n` +
         `• status OT 39845\n` +
         `• estado OT 39845\n\n` +
         `❓ *AYUDA:*\n` +
         `• ayuda (muestra este mensaje)`;
}

// ================== MAIN HANDLER ==================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    // Parse Twilio webhook data (form-encoded)
    const formData = await req.formData();
    const from = formData.get('From') as string; // whatsapp:+1234567890
    const body = (formData.get('Body') as string || '').trim();
    const messageSid = formData.get('MessageSid') as string;
    const profileName = formData.get('ProfileName') as string || 'Unknown';
    
    console.log(`📨 Received from ${from}: "${body}"`);
    
    // Extract phone number
    const phoneNumber = from.replace('whatsapp:', '');
    
    // Check rate limit
    if (!checkRateLimit(phoneNumber)) {
      console.log(`Rate limited: ${phoneNumber}`);
      await sendWhatsAppMessage(from, '⚠️ Has excedido el límite de mensajes. Intenta más tarde.');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }
    
    // Get or create WhatsApp user
    let { data: waUser } = await supabase
      .from('whatsapp_users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    if (!waUser) {
      // Create new user
      const { data: newUser } = await supabase
        .from('whatsapp_users')
        .insert({
          phone_number: phoneNumber,
          whatsapp_name: profileName,
          is_verified: false,
          verification_code: Math.floor(100000 + Math.random() * 900000).toString(),
        })
        .select()
        .single();
      waUser = newUser;
      
      console.log('Created new WhatsApp user:', phoneNumber);
    }
    
    // Update last interaction
    await supabase
      .from('whatsapp_users')
      .update({ 
        last_interaction: new Date().toISOString(),
        whatsapp_name: profileName,
      })
      .eq('id', waUser.id);
    
    // Log incoming message
    await supabase
      .from('whatsapp_messages')
      .insert({
        whatsapp_user_id: waUser.id,
        message_id: messageSid,
        direction: 'inbound',
        message_type: 'text',
        content: body,
        processed: false,
      });
    
    // Detect intent
    const intent = detectIntent(body);
    console.log(`Intent detected: ${intent}`);
    
    let responseMessage = '';
    
    // ===== VERIFICATION FLOW =====
    if (intent === 'verification') {
      if (waUser.is_verified) {
        responseMessage = '✅ Tu número ya está verificado. Envía "ayuda" para ver comandos disponibles.';
      } else if (body === waUser.verification_code) {
        await supabase
          .from('whatsapp_users')
          .update({ is_verified: true })
          .eq('id', waUser.id);
        responseMessage = '✅ ¡Número verificado exitosamente! Ya puedes usar el bot. Envía "ayuda" para ver comandos.';
      } else {
        responseMessage = '❌ Código incorrecto. Solicita un nuevo código a tu supervisor.';
      }
    }
    // Check verification for other commands
    else if (!waUser.is_verified && intent !== 'help') {
      responseMessage = '🔒 Tu número no está verificado.\n\nPara usar este bot, responde con tu código de verificación de 6 dígitos.\n\nSolicítalo a tu supervisor.';
    }
    // ===== HELP FLOW =====
    else if (intent === 'help') {
      responseMessage = getHelpMessage();
    }
    // ===== PRODUCTION REPORTING FLOW =====
    else if (intent === 'production') {
      const parsed = parseProductionReport(body);
      
      if (!parsed.otNumber) {
        responseMessage = '❌ No se pudo identificar el número de OT.\n\nFormato: OT 39845 producido 1500 tiempo 2h 30m';
      } else if (parsed.units <= 0) {
        responseMessage = '❌ No se detectó cantidad de unidades.\n\nFormato: OT 39845 producido 1500 tiempo 2h 30m';
      } else {
        // Find work order by OT number
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('id, ot_number, status, quantity, product_name')
          .eq('ot_number', parseInt(parsed.otNumber))
          .maybeSingle();
        
        if (!workOrder) {
          responseMessage = `❌ OT #${parsed.otNumber} no encontrada en el sistema.`;
        } else if (workOrder.status !== 'in_production' && workOrder.status !== 'approved') {
          responseMessage = `⚠️ OT #${parsed.otNumber} no está en producción (estado: ${workOrder.status}).`;
        } else {
          // Find worker linked to this WhatsApp user
          const { data: worker } = await supabase
            .from('workers')
            .select('id')
            .eq('phone', phoneNumber)
            .maybeSingle();
          
          // Create production report
          const { data: report, error: reportError } = await supabase
            .from('production_reports')
            .insert({
              work_order_id: workOrder.id,
              operator_id: worker?.id || null,
              units_produced: parsed.units,
              time_elapsed_minutes: parsed.timeMinutes,
              time_started: new Date(Date.now() - parsed.timeMinutes * 60000).toISOString(),
              time_ended: new Date().toISOString(),
              status: 'completed',
              reported_via: 'whatsapp',
              whatsapp_message_id: messageSid,
              notes: `Reportado por WhatsApp: ${profileName}`,
            })
            .select()
            .single();
          
          if (reportError) {
            console.error('Error creating production report:', reportError);
            responseMessage = '❌ Error al registrar el reporte. Intenta nuevamente.';
          } else {
            // Get updated totals
            const { data: allReports } = await supabase
              .from('production_reports')
              .select('units_produced')
              .eq('work_order_id', workOrder.id);
            
            const totalProduced = allReports?.reduce((sum: number, r: any) => sum + r.units_produced, 0) || 0;
            const remaining = workOrder.quantity - totalProduced;
            const progress = Math.round((totalProduced / workOrder.quantity) * 100);
            
            responseMessage = `✅ Reporte registrado:\n\n` +
                            `📋 OT #${workOrder.ot_number}\n` +
                            `📦 ${parsed.units.toLocaleString()} unidades\n` +
                            `⏱️ ${parsed.timeHours > 0 ? `${parsed.timeHours} horas` : `${parsed.timeMinutes} minutos`}\n\n` +
                            `━━━━━━━━━━━━━━━\n` +
                            `📊 Total acumulado: ${totalProduced.toLocaleString()}/${workOrder.quantity.toLocaleString()}\n` +
                            `📈 Progreso: ${progress}%\n` +
                            `📉 Pendiente: ${remaining.toLocaleString()} unidades`;
            
            // Mark message as processed
            await supabase
              .from('whatsapp_messages')
              .update({ processed: true, processed_at: new Date().toISOString() })
              .eq('message_id', messageSid);
          }
        }
      }
    }
    // ===== ISSUE REPORTING FLOW =====
    else if (intent === 'issue') {
      // Extract OT if mentioned
      const otMatch = body.match(/OT[-\s#]?(\d{4,6})/i);
      const otNumber = otMatch ? otMatch[1] : null;
      
      // Determine severity based on keywords
      let severity = 'medium';
      if (body.toLowerCase().includes('urgente') || body.toLowerCase().includes('critico') || body.toLowerCase().includes('parada')) {
        severity = 'critical';
      } else if (body.toLowerCase().includes('menor') || body.toLowerCase().includes('pequeño')) {
        severity = 'low';
      }
      
      // Determine issue type
      let issueType = 'other';
      if (body.toLowerCase().includes('maquina') || body.toLowerCase().includes('máquina') || body.toLowerCase().includes('parada')) {
        issueType = 'machine_breakdown';
      } else if (body.toLowerCase().includes('material') || body.toLowerCase().includes('papel') || body.toLowerCase().includes('tinta')) {
        issueType = 'material_defect';
      } else if (body.toLowerCase().includes('calidad') || body.toLowerCase().includes('defecto')) {
        issueType = 'quality_issue';
      } else if (body.toLowerCase().includes('falta') || body.toLowerCase().includes('sin')) {
        issueType = 'shortage';
      }
      
      // Find work order if OT provided
      let workOrderId = null;
      if (otNumber) {
        const { data: wo } = await supabase
          .from('work_orders')
          .select('id')
          .eq('ot_number', parseInt(otNumber))
          .maybeSingle();
        workOrderId = wo?.id;
      }
      
      // Create production issue
      const { data: issue, error: issueError } = await supabase
        .from('production_issues')
        .insert({
          work_order_id: workOrderId,
          issue_type: issueType,
          severity: severity,
          description: body,
          resolved: false,
        })
        .select()
        .single();
      
      if (issueError) {
        console.error('Error creating issue:', issueError);
        responseMessage = '❌ Error al reportar el problema. Intenta nuevamente.';
      } else {
        const severityEmoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
        
        responseMessage = `⚠️ Problema reportado:\n\n` +
                        `${severityEmoji} Severidad: ${severity.toUpperCase()}\n` +
                        `🏷️ Tipo: ${issueType.replace('_', ' ')}\n` +
                        (otNumber ? `📋 OT: #${otNumber}\n` : '') +
                        `\n✅ Supervisor notificado.`;
        
        // TODO: Send notification to supervisor
        // This would require knowing the supervisor's phone number
        
        await supabase
          .from('whatsapp_messages')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('message_id', messageSid);
      }
    }
    // ===== INVENTORY FLOW =====
    else if (intent === 'inventory') {
      const parsed = parseInventoryAction(body);
      
      if (!parsed.action) {
        responseMessage = '❌ No se pudo identificar la acción.\n\nUsa:\n• recepcion [SKU] cantidad X\n• uso [SKU] OT XXXXX cantidad X\n• stock [SKU]';
      } else if (!parsed.itemIdentifier) {
        responseMessage = '❌ Especifica el item entre corchetes.\n\nEjemplo: recepcion [COUCHE300] cantidad 500kg';
      } else {
        // Find inventory item
        const { data: item } = await supabase
          .from('inventory_items')
          .select('id, name, current_stock, unit_of_measure, reorder_point')
          .or(`sku.eq.${parsed.itemIdentifier},barcode.eq.${parsed.itemIdentifier}`)
          .maybeSingle();
        
        if (!item) {
          responseMessage = `❌ Item "${parsed.itemIdentifier}" no encontrado en inventario.`;
        } else if (parsed.action === 'query') {
          const stockStatus = item.current_stock <= (item.reorder_point || 0) ? '⚠️ BAJO' : '✅ OK';
          responseMessage = `📦 *${item.name}*\n\n` +
                          `Stock actual: ${item.current_stock} ${item.unit_of_measure}\n` +
                          `Estado: ${stockStatus}`;
        } else if (parsed.quantity <= 0) {
          responseMessage = '❌ Especifica la cantidad.\n\nEjemplo: recepcion [SKU] cantidad 500kg';
        } else {
          // Find work order if provided
          let workOrderId = null;
          if (parsed.otNumber) {
            const { data: wo } = await supabase
              .from('work_orders')
              .select('id')
              .eq('ot_number', parseInt(parsed.otNumber))
              .maybeSingle();
            workOrderId = wo?.id;
          }
          
          // Create inventory transaction
          const transactionType = parsed.action === 'receive' ? 'purchase' : 'usage';
          const quantityChange = parsed.action === 'receive' ? parsed.quantity : -parsed.quantity;
          
          const { error: txError } = await supabase
            .from('inventory_transactions')
            .insert({
              inventory_item_id: item.id,
              transaction_type: transactionType,
              quantity: parsed.action === 'receive' ? parsed.quantity : parsed.quantity,
              work_order_id: workOrderId,
              scanned_via: 'manual',
              whatsapp_message_id: messageSid,
              notes: `Via WhatsApp: ${body}`,
            });
          
          if (txError) {
            console.error('Error creating transaction:', txError);
            responseMessage = '❌ Error al registrar movimiento. Intenta nuevamente.';
          } else {
            // Update current stock
            const newStock = item.current_stock + quantityChange;
            await supabase
              .from('inventory_items')
              .update({ current_stock: newStock })
              .eq('id', item.id);
            
            const actionVerb = parsed.action === 'receive' ? 'Ingresado' : 'Registrado uso';
            const stockWarning = newStock <= (item.reorder_point || 0) ? '\n\n⚠️ Stock bajo - reordenar pronto' : '';
            
            responseMessage = `✅ ${actionVerb}:\n\n` +
                            `📦 ${item.name}\n` +
                            `📊 Cantidad: ${parsed.quantity} ${item.unit_of_measure}\n` +
                            (workOrderId ? `📋 OT: #${parsed.otNumber}\n` : '') +
                            `\n💾 Stock actual: ${newStock} ${item.unit_of_measure}${stockWarning}`;
            
            await supabase
              .from('whatsapp_messages')
              .update({ processed: true, processed_at: new Date().toISOString() })
              .eq('message_id', messageSid);
          }
        }
      }
    }
    // ===== STATUS QUERY FLOW =====
    else if (intent === 'status') {
      const otMatch = body.match(/OT[-\s#]?(\d{4,6})/i);
      
      if (!otMatch) {
        responseMessage = '❌ Especifica el número de OT.\n\nEjemplo: status OT 39845';
      } else {
        const { data: workOrder } = await supabase
          .from('work_orders')
          .select('id, ot_number, product_name, quantity, status, client_name, delivery_date')
          .eq('ot_number', parseInt(otMatch[1]))
          .maybeSingle();
        
        if (!workOrder) {
          responseMessage = `❌ OT #${otMatch[1]} no encontrada.`;
        } else {
          responseMessage = await formatProductionSummary(supabase, workOrder.id);
          
          // Add status and delivery info
          const statusEmojiMap: Record<string, string> = {
            draft: '📝',
            approved: '✅',
            in_production: '🔄',
            completed: '✓',
            delivered: '📦',
            cancelled: '❌',
          };
          const statusEmoji = statusEmojiMap[workOrder.status] || '❓';
          
          responseMessage += `\n\n${statusEmoji} Estado: ${workOrder.status}`;
          
          if (workOrder.delivery_date) {
            const delivery = new Date(workOrder.delivery_date);
            const today = new Date();
            const daysUntil = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const deliveryWarning = daysUntil < 0 ? ' ⚠️ ATRASADO' : daysUntil <= 2 ? ' ⚠️ URGENTE' : '';
            responseMessage += `\n📅 Entrega: ${delivery.toLocaleDateString('es-CL')}${deliveryWarning}`;
          }
        }
      }
    }
    // ===== UNKNOWN INTENT =====
    else {
      responseMessage = '❓ No entendí tu mensaje.\n\nEnvía "ayuda" para ver los comandos disponibles.';
    }
    
    // Send response
    await sendWhatsAppMessage(from, responseMessage);
    
    // Log outbound message
    await supabase
      .from('whatsapp_messages')
      .insert({
        whatsapp_user_id: waUser.id,
        direction: 'outbound',
        message_type: 'text',
        content: responseMessage,
        processed: true,
        processed_at: new Date().toISOString(),
      });
    
    // Return TwiML empty response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } }
    );
    
  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
