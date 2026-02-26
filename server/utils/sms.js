let twilioClient = null;

const getClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const STATUS_MSGS = {
  'In Progress': 'is being worked on',
  Resolved:      'has been resolved',
  Overdue:       'is overdue and escalated',
  Escalated:     'has been escalated to Commissioner',
};

exports.sendStatusSMS = async (phone, complaintTitle, status) => {
  const client = getClient();
  if (!client) return; // Twilio not configured

  const verb   = STATUS_MSGS[status] || `is now ${status}`;
  const body   = `[CivicVoice] Your complaint "${complaintTitle.slice(0, 50)}" ${verb}. Visit civicvoice.in to track.`;

  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to:   phone,
  });
  console.log(`📱 SMS sent to ${phone}`);
};

// WhatsApp: send status update via Twilio WhatsApp sandbox
exports.sendWhatsAppUpdate = async (phone, complaintTitle, status, complaintId) => {
  const client = getClient();
  if (!client || !process.env.TWILIO_WHATSAPP_FROM) return;

  const verb     = STATUS_MSGS[status] || `is now ${status}`;
  const statusEmoji = { 'In Progress': '🔧', Resolved: '✅', Overdue: '🚨', Escalated: '⚡', Pending: '⏳' }[status] || '🔔';

  const body = `${statusEmoji} *CivicVoice Update*\n\nYour complaint *"${complaintTitle.slice(0, 60)}"* ${verb}.\n\nTrack it at: civicvoice.in/complaints/${complaintId}`;

  // Normalize phone to WhatsApp format
  const waPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;

  await client.messages.create({
    body,
    from: process.env.TWILIO_WHATSAPP_FROM, // e.g. whatsapp:+14155238886
    to:   waPhone,
  });
  console.log(`💬 WhatsApp sent to ${phone}`);
};

// WhatsApp: confirm complaint filed
exports.sendWhatsAppConfirmation = async (phone, complaintTitle, complaintId) => {
  const client = getClient();
  if (!client || !process.env.TWILIO_WHATSAPP_FROM) return;

  const body = `📋 *CivicVoice — Complaint Filed!*\n\n✅ Your complaint *"${complaintTitle.slice(0, 60)}"* has been registered.\n\n🆔 ID: *${complaintId}*\nTrack at: civicvoice.in/complaints/${complaintId}\n\nWe'll notify you of all updates here on WhatsApp.`;

  const waPhone = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
  await client.messages.create({ body, from: process.env.TWILIO_WHATSAPP_FROM, to: waPhone });
  console.log(`💬 WhatsApp confirmation sent to ${phone}`);
};

