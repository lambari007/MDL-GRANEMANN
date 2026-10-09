const SHEET_NAME = 'Contatos';
const HEADERS = [
  'ID','Criado em','Nome do contato','Empresa/CTG','Telefone WhatsApp','Cidade','UF',
  'Evento/Rodeio','Serviço de interesse','Etapa','Último contato','Próximo contato',
  'Prioridade','Observações','Última mensagem','Consentimento WhatsApp'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('CRM Secretaria Granemann')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function setupCrm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abra este projeto pelo menu Extensões > Apps Script dentro da sua planilha.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, HEADERS.length);
  return 'Planilha preparada. Aba Contatos criada/verificada.';
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Planilha não encontrada. Execute setupCrm uma vez no editor do Apps Script aberto pela planilha.');
  if (!spreadsheetId) props.setProperty('SPREADSHEET_ID', ss.getId());
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { setupCrm(); sheet = ss.getSheetByName(SHEET_NAME); }
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function listContacts() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  return values.slice(1).filter(r => r[0]).map(r => rowToContact_(r));
}

function rowToContact_(r) {
  return {
    id: String(r[0] || ''), createdAt: dateOut_(r[1]), name: String(r[2] || ''),
    organization: String(r[3] || ''), phone: String(r[4] || ''), city: String(r[5] || ''),
    state: String(r[6] || ''), event: String(r[7] || ''), service: String(r[8] || ''),
    stage: String(r[9] || 'Novo'), lastContact: dateOut_(r[10]), nextContact: dateOut_(r[11]),
    priority: String(r[12] || 'Normal'), notes: String(r[13] || ''), lastMessage: String(r[14] || ''),
    consent: String(r[15] || 'Não confirmado')
  };
}
function dateOut_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function saveContact(contact) {
  if (!contact || !String(contact.name || '').trim()) throw new Error('Informe o nome do contato.');
  const sheet = getSheet_();
  const all = sheet.getDataRange().getValues();
  const id = contact.id || Utilities.getUuid();
  const now = new Date();
  const row = [
    id, contact.createdAt ? new Date(contact.createdAt + 'T12:00:00') : now,
    clean_(contact.name), clean_(contact.organization), clean_(contact.phone), clean_(contact.city),
    clean_(contact.state), clean_(contact.event), clean_(contact.service), clean_(contact.stage || 'Novo'),
    contact.lastContact ? new Date(contact.lastContact + 'T12:00:00') : '',
    contact.nextContact ? new Date(contact.nextContact + 'T12:00:00') : '',
    clean_(contact.priority || 'Normal'), clean_(contact.notes), clean_(contact.lastMessage), clean_(contact.consent || 'Não confirmado')
  ];
  let targetRow = -1;
  for (let i = 1; i < all.length; i++) if (String(all[i][0]) === String(id)) { targetRow = i + 1; break; }
  if (targetRow > 0) sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
  return { ok: true, id: id };
}

function deleteContact(id) {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return { ok: true }; }
  }
  throw new Error('Contato não encontrado.');
}

function sendWhatsAppTemplate(contactId) {
  const contact = listContacts().find(c => c.id === String(contactId));
  if (!contact) throw new Error('Contato não encontrado.');
  if (contact.consent !== 'Sim') throw new Error('Antes de enviar, confirme que o contato autorizou receber mensagens pelo WhatsApp.');
  const phone = normalizePhone_(contact.phone);
  if (!phone) throw new Error('Informe um telefone válido com DDI e DDD, por exemplo 5549999999999.');
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('WHATSAPP_TOKEN');
  const phoneNumberId = props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  const templateName = props.getProperty('WHATSAPP_TEMPLATE_NAME') || 'prospeccao_servicos';
  const language = props.getProperty('WHATSAPP_TEMPLATE_LANGUAGE') || 'pt_BR';
  if (!token || !phoneNumberId) throw new Error('Configure WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID nas Propriedades do script.');

  // O modelo aprovado no WhatsApp Manager deve ter 3 variáveis de corpo: nome, serviço e evento.
  const payload = {
    messaging_product: 'whatsapp', to: phone, type: 'template',
    template: { name: templateName, language: { code: language }, components: [{ type: 'body', parameters: [
      { type: 'text', text: contact.name || 'tudo bem' },
      { type: 'text', text: contact.service || 'secretaria de rodeios e sistema MDL' },
      { type: 'text', text: contact.event || 'seus próximos eventos' }
    ] }] }
  };
  const response = UrlFetchApp.fetch('https://graph.facebook.com/v23.0/' + encodeURIComponent(phoneNumberId) + '/messages', {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) throw new Error('WhatsApp API retornou ' + code + ': ' + body);
  const updated = Object.assign({}, contact, {
    lastContact: today_(), lastMessage: 'Modelo ' + templateName + ' enviado em ' + today_(),
    stage: contact.stage === 'Novo' ? 'Mensagem enviada' : contact.stage
  });
  saveContact(updated);
  return { ok: true, message: 'Solicitação de envio aceita pela API do WhatsApp.' };
}

function normalizePhone_(raw) {
  let p = String(raw || '').replace(/\D/g, '');
  if (!p) return '';
  // Para números brasileiros digitados com DDD, acrescenta o DDI 55.
  if (p.length === 10 || p.length === 11) p = '55' + p;
  if (p.length < 12 || p.length > 15) return '';
  return p;
}
function clean_(v) { return String(v == null ? '' : v).trim(); }
function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
