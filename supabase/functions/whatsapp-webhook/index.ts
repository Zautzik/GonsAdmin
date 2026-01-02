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

interface ParsedMessage {
  workerCode: string | null;
  otNumber: string | null;
  units: number;
  timeMinutes: number;
  machine: string | null;
  qualityNotes: string | null;
  type: 'production' | 'maintenance' | 'idle';
  idleReason: string | null;
  maintenanceDescription: string | null;
}

// Parse natural language messages from workers
function parseMessage(message: string): ParsedMessage {
  const normalizedMsg = message.toLowerCase().trim();
  
  let type: 'production' | 'maintenance' | 'idle' = 'production';
  let idleReason: string | null = null;
  let maintenanceDescription: string | null = null;
  
  // Check for maintenance/idle keywords
  if (normalizedMsg.includes('mantenimiento') || normalizedMsg.includes('maintenance')) {
    type = 'maintenance';
    maintenanceDescription = message;
  } else if (normalizedMsg.includes('parado') || normalizedMsg.includes('idle') || normalizedMsg.includes('esperando') || normalizedMsg.includes('sin trabajo')) {
    type = 'idle';
    idleReason = message;
  }
  
  // Extract worker code (e.g., W045, T123)
  const workerCodeMatch = message.match(/\b([WwTt]\d{2,4})\b/);
  const workerCode = workerCodeMatch ? workerCodeMatch[1].toUpperCase() : null;
  
  // Extract OT number (e.g., OT-2024-001, OT001, 2024-001)
  const otMatch = message.match(/(?:OT[-\s]?)?(\d{4}[-\s]?\d{3}|\d{3,6})/i);
  const otNumber = otMatch ? otMatch[0].toUpperCase().replace(/\s/g, '-') : null;
  
  // Extract units (look for numbers followed by unit keywords)
  const unitsMatch = message.match(/(\d+)\s*(?:hojas?|pliegos?|unidades?|pzas?|sheets?|units?|piezas?)/i);
  const units = unitsMatch ? parseInt(unitsMatch[1]) : 0;
  
  // Extract time (e.g., 2h, 2 horas, 30min, 1.5h)
  let timeMinutes = 0;
  const hoursMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:h(?:oras?)?|hrs?)/i);
  const minutesMatch = message.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/i);
  
  if (hoursMatch) {
    timeMinutes += Math.round(parseFloat(hoursMatch[1]) * 60);
  }
  if (minutesMatch) {
    timeMinutes += parseInt(minutesMatch[1]);
  }
  
  // Extract machine reference
  const machineMatch = message.match(/(?:maquina|máquina|machine|maq\.?)\s*[:#]?\s*(\w+)/i);
  const machine = machineMatch ? machineMatch[1] : null;
  
  // Extract quality notes (anything after "nota:", "calidad:", "observación:")
  const notesMatch = message.match(/(?:nota|calidad|observación|obs|issue|problema)[:\s]+(.+?)(?:\.|$)/i);
  const qualityNotes = notesMatch ? notesMatch[1].trim() : null;
  
  return {
    workerCode,
    otNumber,
    units,
    timeMinutes,
    machine,
    qualityNotes,
    type,
    idleReason,
    maintenanceDescription,
  };
}

// Send WhatsApp reply via Twilio
async function sendWhatsAppReply(to: string, message: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.error('Twilio credentials not configured');
    return;
  }
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('From', `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
  formData.append('To', to);
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
    } else {
      console.log('WhatsApp reply sent successfully');
    }
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Parse Twilio webhook data (form-encoded)
    const formData = await req.formData();
    const from = formData.get('From') as string; // whatsapp:+1234567890
    const body = formData.get('Body') as string;
    const groupName = formData.get('ProfileName') as string || 'Unknown';
    
    console.log(`Received message from ${from}: ${body}`);
    
    // Extract phone number
    const phoneNumber = from.replace('whatsapp:', '').replace('+', '');
    
    // Parse the message
    const parsed = parseMessage(body);
    
    // Try to find worker by phone first, then by code
    let workerId: string | null = null;
    
    // Phone lookup
    const { data: workerByPhone } = await supabase
      .from('workers')
      .select('id, name')
      .eq('phone', phoneNumber)
      .maybeSingle();
    
    if (workerByPhone) {
      workerId = workerByPhone.id;
    } else if (parsed.workerCode) {
      // Code lookup
      const { data: workerByCode } = await supabase
        .from('workers')
        .select('id, name')
        .eq('worker_code', parsed.workerCode)
        .maybeSingle();
      
      if (workerByCode) {
        workerId = workerByCode.id;
      }
    }
    
    // Try to find OT
    let otId: string | null = null;
    if (parsed.otNumber) {
      const { data: ot } = await supabase
        .from('ots')
        .select('id')
        .ilike('ot_number', `%${parsed.otNumber}%`)
        .maybeSingle();
      
      if (ot) {
        otId = ot.id;
      }
    }
    
    // Try to find machine
    let machineId: string | null = null;
    if (parsed.machine) {
      const { data: machine } = await supabase
        .from('machines')
        .select('id')
        .ilike('name', `%${parsed.machine}%`)
        .maybeSingle();
      
      if (machine) {
        machineId = machine.id;
      }
    }
    
    // Insert submission
    const { data: submission, error } = await supabase
      .from('progress_submissions')
      .insert({
        worker_phone: phoneNumber,
        worker_id: workerId,
        worker_code: parsed.workerCode,
        ot_id: otId,
        machine_id: machineId,
        submission_type: parsed.type,
        units_reported: parsed.units,
        time_reported_minutes: parsed.timeMinutes,
        quality_notes: parsed.qualityNotes,
        idle_reason: parsed.idleReason,
        maintenance_description: parsed.maintenanceDescription,
        raw_message: body,
        whatsapp_group: groupName,
        status: 'pending',
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting submission:', error);
      await sendWhatsAppReply(from, '❌ Error al registrar. Intente nuevamente.');
      return new Response('Error', { status: 500, headers: corsHeaders });
    }
    
    // Build confirmation message
    let confirmationMsg = '✅ Recibido:\n';
    if (parsed.type === 'production') {
      confirmationMsg += `📦 ${parsed.units} unidades\n`;
      if (parsed.timeMinutes > 0) {
        const hours = Math.floor(parsed.timeMinutes / 60);
        const mins = parsed.timeMinutes % 60;
        confirmationMsg += `⏱️ ${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}min` : ''}\n`;
      }
      if (parsed.otNumber) confirmationMsg += `📋 OT: ${parsed.otNumber}\n`;
    } else if (parsed.type === 'maintenance') {
      confirmationMsg += '🔧 Reporte de mantenimiento registrado\n';
    } else {
      confirmationMsg += '⏸️ Tiempo de espera registrado\n';
    }
    
    if (!workerId) {
      confirmationMsg += '\n⚠️ No pudimos identificarte. Incluye tu código (ej: W001) o registra tu teléfono con el supervisor.';
    }
    if (parsed.otNumber && !otId) {
      confirmationMsg += `\n⚠️ OT "${parsed.otNumber}" no encontrada.`;
    }
    
    confirmationMsg += '\n\n📝 Pendiente de aprobación del supervisor.';
    
    await sendWhatsAppReply(from, confirmationMsg);
    
    console.log('Submission created:', submission.id);
    
    // Return TwiML empty response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'text/xml',
        },
      }
    );
    
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
