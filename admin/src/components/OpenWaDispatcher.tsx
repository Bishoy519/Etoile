import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { OpenWaMessage } from '../types';
import { exportCsv } from '../utils/csv';
import { ViewSwitcher, useViewPrefs } from './ViewSwitcher';
import { SmsFallbackCard } from './SmsFallbackCard';
import {
  MessageSquare,
  Send,
  Bell,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  Phone,
  Sparkles,
  Search,
  Smartphone,
  CheckCheck,
  QrCode,
  Radio,
  Settings,
  RefreshCw,
  Power,
  ShieldCheck,
  Server,
  UserCheck,
  ExternalLink,
  Download,
} from 'lucide-react';

export const OpenWaDispatcher: React.FC = () => {
  const {
    openWaQueue,
    triggerOpenWaAlert,
    language,
    students,
    staffList,
    showToast,
    whatsAppConfig,
    connectWhatsApp,
    confirmWhatsAppPairing,
    disconnectWhatsApp,
    updateWhatsAppGateway,
  } = useAdmin();

  // Active Tab: 'composer' | 'gateway' | 'history'
  const [activeTab, setActiveTab] = useState<'composer' | 'gateway' | 'history'>('composer');

  // Direct Composer State
  const [recipientType, setRecipientType] = useState<'student' | 'instructor' | 'manual'>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [messageBody, setMessageBody] = useState<string>('');
  const [messageType, setMessageType] = useState<OpenWaMessage['triggerEvent']>('class_reminder');

  // Stream Search & Filter State
  const [streamSearch, setStreamSearch] = useState<string>('');

  const [streamFilter, setStreamFilter] = useState<string>('all');
  const waView = useViewPrefs('openwa-history', 'cards');
  // Gateway Settings State
  const [connecting, setConnecting] = useState<boolean>(false);
  const [showGatewayConfig, setShowGatewayConfig] = useState<boolean>(false);
  const [gatewayForm, setGatewayForm] = useState({
    mode: (whatsAppConfig?.mode || 'builtin_qr') as 'builtin_qr' | 'external_gateway',
    provider: whatsAppConfig?.provider || 'builtin_qr',
    endpointUrl: whatsAppConfig?.endpointUrl || whatsAppConfig?.gatewayUrl || 'http://localhost:21465',
    gatewayUrl: whatsAppConfig?.gatewayUrl || 'http://localhost:21465',
    apiKey: whatsAppConfig?.apiKey || '',
    sessionName: whatsAppConfig?.sessionName || 'etoile-conservatory',
    autoReconnect: whatsAppConfig?.autoReconnect ?? true,
  });

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    const stu = students.find((s) => s.id === id);
    if (stu) {
      setCustomRecipient(stu.parentName || stu.name);
      setCustomPhone(stu.parentPhone || '');
      setMessageBody(
        language === 'ar'
          ? `مرحباً ${stu.parentName || stu.name}، تحية من كونسرفتوار إتوال للباليه بخصوص الطالب/ة ${stu.name}.`
          : `Bonjour ${stu.parentName || stu.name}, greeting from Étoile Ballet Academy reception regarding ${stu.name}.`
      );
    }
  };

  const handleStaffSelect = (id: string) => {
    setSelectedStaffId(id);
    const staff = staffList.find((s) => s.id === id);
    if (staff) {
      setCustomRecipient(staff.name);
      setCustomPhone(staff.phone || '');
      setMessageBody(
        language === 'ar'
          ? `مرحباً ${staff.name}، إشعار رسمي من إدارة كونسرفتوار إتوال للباليه بخصوص جدول الحصص اليوم.`
          : `Dear ${staff.name}, official notice from Étoile Conservatory administration regarding today's schedule.`
      );
    }
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim() || !messageBody.trim()) {
      showToast(
        language === 'ar' ? 'خطأ في الإدخال' : 'Validation Error',
        language === 'ar' ? 'رقم الهاتف ونص الرسالة مطلوبان.' : 'Recipient phone and message body are required.',
        'error'
      );
      return;
    }
    const digits = customPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      showToast(language === 'ar' ? 'رقم غير صالح' : 'Invalid phone', language === 'ar' ? 'رقم الهاتف يجب أن يحتوي 7–15 رقماً.' : 'Phone must contain 7–15 digits.', 'error');
      return;
    }
    if (messageBody.trim().length < 5) {
      showToast(language === 'ar' ? 'رسالة قصيرة' : 'Message too short', language === 'ar' ? 'نص الرسالة قصير جداً.' : 'Message body is too short.', 'error');
      return;
    }
    const connected = whatsAppConfig?.status === 'connected';
    if (!connected) {
      showToast(language === 'ar' ? 'غير متصل' : 'Not connected', language === 'ar' ? 'اربط واتساب أولاً — سيُحفظ في قائمة الانتظار.' : 'Link WhatsApp first — message will be queued.', 'warning');
    }

    await triggerOpenWaAlert(
      messageType,
      customPhone.trim(),
      customRecipient.trim() || 'Parent/Guardian',
      messageBody.trim()
    );

    showToast(
      language === 'ar' ? 'تم إرسال الرسالة' : 'WhatsApp Dispatched',
      language === 'ar' ? `تم إرسال الإشعار إلى ${customPhone}.` : `Message dispatched to ${customPhone}.`,
      'success'
    );
    setMessageBody('');
  };

  const handleApplyTemplate = (type: OpenWaMessage['triggerEvent']) => {
    setMessageType(type);
    const recipientName = customRecipient || (language === 'ar' ? 'المستلم' : 'Recipient');
    const targetName = selectedStudentId
      ? students.find((s) => s.id === selectedStudentId)?.name || 'Student'
      : 'Student';

    if (type === 'class_reminder') {
      setMessageBody(
        language === 'ar'
          ? `تذكير من إتوال: حلقة تدريب الباليه القادمة للطالب/ة ${targetName} مجدولة قريباً. يرجى الحضور قبل 15 دقيقة بالزي المعتمد.`
          : `Étoile Reminder: Upcoming ballet session for ${targetName} is scheduled. Please arrive 15 minutes before start in regulation uniform.`
      );
    } else if (type === 'quota_warning') {
      setMessageBody(
        language === 'ar'
          ? `تحذير رصيد: نود إعلامكم بأن الطالب/ة ${targetName} شارف اشتراكه على الانتهاء (تبقى حصتان أو أقل). يرجى التجديد عبر الإدارة.`
          : `Package Notice: Student ${targetName} has 2 or fewer classes remaining in package. Please renew with front desk to keep reservation.`
      );
    } else if (type === 'debt_reminder') {
      setMessageBody(
        language === 'ar'
          ? `كشف حساب: يرجى تسوية الرصيد المتبقي المستحق على حساب الطالب/ة ${targetName}. يمكنكم الدفع نقداً أو بالبطاقة لدى الاستقبال.`
          : `Account Statement: Unsettled balance on account for ${targetName}. Please visit the reception desk to finalize payment.`
      );
    } else if (type === 'late_arrival') {
      setMessageBody(
        language === 'ar'
          ? `إشعار وصول: تم تسجيل وصول الطالب/ة ${targetName} إلى قاعة التدريب. نتمنى له/لها حصة تدريبية ملهمة وموفقة.`
          : `Check-in Notice: Student ${targetName} has successfully scanned into the studio room. Wishing them an inspiring training session.`
      );
    } else if (type === 'instructor_tardiness') {
      setMessageBody(
        language === 'ar'
          ? `تنبيه تدريس: نذكّر المدرب الكريم ببدء الحصة المجدولة في استوديو الأكاديمية خلال 15 دقيقة. يرجى تأكيد التواجد.`
          : `Faculty Notice: Session scheduled to commence in 15 minutes. Please verify attendance at studio reception.`
      );
    } else if (type === 'purchase_receipt') {
      setMessageBody(
        language === 'ar'
          ? `🧾 إيصال شراء — أكاديمية إيتوال للباليه\nعزيزي/تي ${recipientName}، نشكركم لتسوقكم في بوتيك الأكاديمية. تم استلام وتسجيل طلبكم وتأكيد الدفع بنجاح. نتمنى لكم يوماً رائعاً! ✨`
          : `🧾 Purchase Receipt — Étoile Ballet Academy\nDear ${recipientName}, thank you for shopping at Étoile Boutique! Your store purchase has been processed and confirmed. Have a wonderful day! ✨`
      );
    } else if (type === 'checkin_receipt') {
      setMessageBody(
        language === 'ar'
          ? `🎟️ إشعار دخول: تم تسجيل دخول الطالب/ة ${targetName} بنجاح إلى الأكاديمية. نتمنى له/لها تمريناً ممتعاً وموفقاً.`
          : `🎟️ Entry Confirmation: Student ${targetName} has checked in successfully at Étoile Academy reception.`
      );
    } else if (type === 'announcement') {
      setMessageBody(
        language === 'ar'
          ? `📢 إعلان هام من أكاديمية إيتوال للباليه إلى أولياء الأمور والطلاب الكرام.`
          : `📢 Official Announcement from Étoile Ballet Academy to our valued students and families.`
      );
    }
  };

  const handleConnect = async (mode: 'builtin_qr' | 'external_gateway') => {
    setConnecting(true);
    try {
      await connectWhatsApp(mode);
      showToast(
        language === 'ar' ? 'طلب الاتصال' : 'Connection Initiated',
        mode === 'builtin_qr'
          ? language === 'ar'
            ? 'تم إنشاء رمز QR للربط المباشر. يرجى مسحه بهاتف واتساب.'
            : 'Pairing QR code generated. Scan with your WhatsApp app.'
          : language === 'ar'
          ? 'تم توجيه الاتصال إلى بوابة Open-Source الخارجية.'
          : 'Connecting to external open-source WhatsApp gateway.',
        'gold'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleConfirmPairing = async () => {
    const phone = prompt(
      language === 'ar'
        ? 'أدخل رقم الهاتف المقترن للمصادقة (+201xxxxxxxxx أو +336xxxxxxxx):'
        : 'Enter paired WhatsApp phone number (+1xxxxxxx or +33xxxxxxx):',
      customPhone || ''
    );
    if (!phone) return;
    if (phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) {
      showToast(language === 'ar' ? 'رقم غير صالح' : 'Invalid phone', language === 'ar' ? 'رقم الهاتف يجب أن يحتوي 7–15 رقماً.' : 'Phone must contain 7–15 digits.', 'error');
      return;
    }
    await confirmWhatsAppPairing(phone.trim(), 'Étoile Official Desk');
  };

  const handleSaveGatewaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gatewayForm.mode === 'external_gateway' && !gatewayForm.gatewayUrl.trim()) {
      showToast(language === 'ar' ? 'رابط مطلوب' : 'URL required', language === 'ar' ? 'رابط البوابة الخارجية مطلوب.' : 'External gateway URL is required.', 'error');
      return;
    }
    if (gatewayForm.gatewayUrl.trim()) {
      try {
        const u = new URL(gatewayForm.gatewayUrl.trim());
        if (!['http:', 'https:'].includes(u.protocol)) { showToast('Invalid URL', 'Gateway URL must start with http(s)://.', 'error'); return; }
      } catch { showToast('Invalid URL', 'Gateway URL is not valid.', 'error'); return; }
    }
    if (!gatewayForm.sessionName.trim()) {
      showToast(language === 'ar' ? 'اسم الجلسة مطلوب' : 'Session required', language === 'ar' ? 'اسم الجلسة مطلوب.' : 'Session name is required.', 'error');
      return;
    }
    await updateWhatsAppGateway(gatewayForm);
    setShowGatewayConfig(false);
    showToast(
      language === 'ar' ? 'تم الحفظ' : 'Settings Saved',
      language === 'ar' ? 'تم تحديث إعدادات بوابة الواتساب.' : 'WhatsApp gateway configuration updated.',
      'success'
    );
  };

  const isConnected = whatsAppConfig?.status === 'connected';

  const filteredQueue = openWaQueue.filter((msg) => {
    const matchesSearch =
      msg.recipientName.toLowerCase().includes(streamSearch.toLowerCase()) ||
      msg.recipientPhone.includes(streamSearch) ||
      msg.body.toLowerCase().includes(streamSearch.toLowerCase());
    const matchesFilter = streamFilter === 'all' || msg.triggerEvent === streamFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header with Navigation Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-widest font-semibold mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{language === 'ar' ? 'البث والاتصالات المفتوحة' : 'Open Communications Hub'}</span>
          </div>
          <h3 className="font-heading font-bold text-xl sm:text-3xl text-white">
            {language === 'ar' ? 'بوابة واتساب المفتوحة (OpenWA Gateway)' : 'Open-Source WhatsApp Hub'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ar'
              ? 'اتصال حقيقي بأجهزة واتساب، ربط مباشر برمز QR، وجدولة التذكيرات التلقائية للحصص والاشتراكات.'
              : 'Real WhatsApp device pairing, QR code linking, pre-session automated notifications, and student dispatches.'}
          </p>
        </div>

        {/* Status Pill & Tab Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono font-bold ${
              isConnected
                ? 'status-pill-emerald'
                : whatsAppConfig?.status === 'pairing'
                ? 'status-pill-amber'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>
              {isConnected
                ? `${whatsAppConfig?.pushName || 'Étoile'} (${whatsAppConfig?.phoneNumber || 'Connected'})`
                : whatsAppConfig?.status === 'pairing'
                ? language === 'ar'
                  ? 'بانتظار مسح QR...'
                  : 'Awaiting QR Scan...'
                : language === 'ar'
                ? 'واتساب غير متصل'
                : 'WhatsApp Disconnected'}
            </span>
          </div>

          <div className="inline-flex rounded-xl p-1 bg-[#171d2b] border border-white/10 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setActiveTab('composer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'composer'
                  ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'إرسال رسالة' : 'Compose'}
            </button>
            <button
              onClick={() => setActiveTab('gateway')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'gateway'
                  ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'ربط الحساب (QR)' : 'Connection / QR'}</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'history'
                  ? 'nav-pill-active bg-white text-slate-950 font-bold shadow-md shadow-white/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'ar' ? 'سجل الإشعارات' : 'Dispatches'} ({openWaQueue.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: GATEWAY CONNECTION & QR PAIRING */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          <SmsFallbackCard />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: QR Code & Status */}
            <div className="lg:col-span-7 bg-[#171d2b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-amber-300">
                  <QrCode className="w-5 h-5" />
                  <h4 className="font-heading text-lg font-bold text-white">
                    {language === 'ar' ? 'ربط جهاز واتساب (QR Code Pairing)' : 'Pair WhatsApp Device'}
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Mode: {whatsAppConfig?.mode || 'builtin_qr'}
                </span>
              </div>

              {/* Instructions */}
              <div className="bg-[#111622] border border-white/5 rounded-xl p-4 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-white">
                  {language === 'ar' ? 'كيفية ربط واتساب الأكاديمية:' : 'Instructions to connect:'}
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-slate-400">
                  <li>
                    {language === 'ar'
                      ? 'افتح تطبيق واتساب على هاتفك الرسمي.'
                      : 'Open WhatsApp on your official mobile phone.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'انتقل إلى الإعدادات > الأجهزة المرتبطة (Linked Devices).'
                      : 'Go to Settings > Linked Devices.'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'انقر فوق "ربط جهاز" ووجّه الكاميرا نحو رمز QR أدناه.'
                      : 'Tap "Link a Device" and point camera at the QR code below.'}
                  </li>
                </ol>
              </div>

              {/* QR Code Presentation Box */}
              <div className="flex flex-col items-center justify-center p-6 bg-[#111622] border border-white/10 rounded-2xl space-y-4 max-w-full overflow-hidden">
                {whatsAppConfig?.qrCodeData ? (
                  <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-amber-400/40 max-w-full overflow-hidden">
                    <img
                      src={whatsAppConfig.qrCodeData}
                      alt="WhatsApp Pairing QR Code"
                      className="w-56 h-56 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-56 h-56 max-w-full border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <QrCode className="w-12 h-12 text-slate-500" />
                    <p className="text-xs text-slate-400">
                      {isConnected
                        ? language === 'ar'
                          ? 'الجهاز متصل ومقترن بنجاح'
                          : 'Device is successfully paired and active.'
                        : language === 'ar'
                        ? 'انقر على الزر أدناه لتوليد رمز الاستجابة السريعة (QR).'
                        : 'Click button below to generate pairing QR code.'}
                    </p>
                  </div>
                )}

                {/* QR Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => handleConnect('builtin_qr')}
                    disabled={connecting}
                    className="action-btn-coral px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                    <span>
                      {whatsAppConfig?.qrCodeData
                        ? language === 'ar'
                          ? 'تحديث رمز QR'
                          : 'Regenerate QR'
                        : language === 'ar'
                        ? 'توليد رمز QR جديد'
                        : 'Generate Pairing QR'}
                    </span>
                  </button>

                  {!isConnected && whatsAppConfig?.qrCodeData && (
                    <button
                      onClick={handleConfirmPairing}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تأكيد الاقتران الآن' : 'Confirm Scanned'}</span>
                    </button>
                  )}

                  {isConnected && (
                    <button
                      onClick={disconnectWhatsApp}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'قطع الاتصال' : 'Disconnect'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Open-Source Gateway Server Integration */}
            <div className="lg:col-span-5 bg-[#171d2b] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <Server className="w-4 h-4" />
                  <h4 className="font-heading text-base font-bold text-white">
                    {language === 'ar' ? 'خادم البوابة المفتوحة (WPPConnect / Evolution API)' : 'Open-Source Gateway Setup'}
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'يدعم كونسرفتوار إتوال الاتصال بأي خادم مفتوح المصدر (WPPConnect، Baileys، أو Evolution API) مثبت محلياً أو على خادم خارجي.'
                  : 'Étoile supports pairing via WPPConnect, Baileys HTTP, or Evolution API running locally (e.g. port 21465) or remotely.'}
              </p>

              <form onSubmit={handleSaveGatewaySettings} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    {language === 'ar' ? 'وضع البوابة (Gateway Mode)' : 'Gateway Mode'}
                  </label>
                  <select
                    value={gatewayForm.mode}
                    onChange={(e: any) => setGatewayForm({ ...gatewayForm, mode: e.target.value })}
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl text-xs cursor-pointer focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="builtin_qr">Built-in Dynamic QR (In-App Pairing)</option>
                    <option value="external_gateway">External Open-Source Gateway (WPPConnect / Evolution)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    {language === 'ar' ? 'عنوان الخادم (API Endpoint URL)' : 'Gateway Endpoint URL'}
                  </label>
                  <input
                    type="url"
                    value={gatewayForm.gatewayUrl}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, gatewayUrl: e.target.value })}
                    placeholder="http://localhost:21465"
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    {language === 'ar' ? 'اسم الجلسة (Session Name)' : 'Session Name'}
                  </label>
                  <input
                    type="text"
                    value={gatewayForm.sessionName}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, sessionName: e.target.value })}
                    placeholder="etoile-conservatory"
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    {language === 'ar' ? 'مفتاح الحماية السري (API Secret Key)' : 'Secret API Key'}
                  </label>
                  <input
                    type="password"
                    value={gatewayForm.apiKey}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                    placeholder="Optional / Bearer Token"
                    className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="action-btn-coral w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'حفظ إعدادات البوابة' : 'Save Gateway Configuration'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPOSER & SMARTPHONE PREVIEW */}
      {activeTab === 'composer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Composer Form Card */}
            <div className="lg:col-span-7 bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-amber-300">
                  <Send className="w-4 h-4 flex-shrink-0" />
                  <h4 className="font-heading text-base sm:text-lg font-bold text-white">
                    {language === 'ar' ? 'محرر رسائل واتساب المباشرة' : 'Send WhatsApp Message'}
                  </h4>
                </div>

                {/* Recipient Type Switcher */}
                <div className="inline-flex rounded-xl p-1 bg-[#111622] border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setRecipientType('student')}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      recipientType === 'student' ? 'nav-pill-active bg-white text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'طالب / ولي أمر' : 'Student'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('instructor')}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      recipientType === 'instructor' ? 'nav-pill-active bg-white text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'مدرب / موظف' : 'Faculty'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('manual')}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      recipientType === 'manual' ? 'nav-pill-active bg-white text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? 'يدوي' : 'Manual'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendDirectMessage} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recipientType === 'student' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {language === 'ar' ? 'اختر راقصاً مسجلاً' : 'Select Student'}
                      </label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => handleStudentSelect(e.target.value)}
                        className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2.5 rounded-xl text-xs cursor-pointer min-h-[42px] focus:outline-none focus:border-amber-400/50"
                      >
                        <option value="">{language === 'ar' ? '-- اختيار الطالب --' : '-- Choose Student --'}</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.parentName || s.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {recipientType === 'instructor' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {language === 'ar' ? 'اختر مدرباً / معلماً' : 'Select Faculty / Coach'}
                      </label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => handleStaffSelect(e.target.value)}
                        className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2.5 rounded-xl text-xs cursor-pointer min-h-[42px] focus:outline-none focus:border-amber-400/50"
                      >
                        <option value="">{language === 'ar' ? '-- اختيار المدرب --' : '-- Choose Instructor --'}</option>
                        {staffList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {recipientType === 'manual' && (
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {language === 'ar' ? 'نوع الإشعار' : 'Notice Category'}
                      </label>
                      <select
                        value={messageType}
                        onChange={(e: any) => setMessageType(e.target.value)}
                        className="w-full bg-[#111622] border border-white/10 text-white px-3 py-2.5 rounded-xl text-xs cursor-pointer min-h-[42px] focus:outline-none focus:border-amber-400/50"
                      >
                        <option value="class_reminder">Class Reminder</option>
                        <option value="quota_warning">Quota Warning</option>
                        <option value="debt_reminder">Debt Reminder</option>
                        <option value="late_arrival">Late Arrival</option>
                        <option value="instructor_tardiness">Instructor Tardiness</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {language === 'ar' ? 'اسم المستلم' : 'Recipient Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customRecipient}
                      onChange={(e) => setCustomRecipient(e.target.value)}
                      placeholder={language === 'ar' ? 'اسم ولي الأمر / المستقبل' : 'Recipient Name'}
                      className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2.5 rounded-xl text-xs min-h-[42px] focus:outline-none focus:border-amber-400/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {language === 'ar' ? 'رقم الواتساب (+كود الدولة)' : 'WhatsApp Phone (+Country)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="+20 100 123 4567"
                      className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 px-3 py-2.5 rounded-xl text-xs font-mono min-h-[42px] focus:outline-none focus:border-amber-400/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {language === 'ar' ? 'نص الرسالة المعتمد' : 'Message Body'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('class_reminder')}
                        className="text-[10px] text-amber-300 hover:underline py-0.5 cursor-pointer font-semibold"
                      >
                        + {language === 'ar' ? 'تذكير بالحصة' : 'Class Reminder'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('quota_warning')}
                        className="text-[10px] text-amber-300 hover:underline py-0.5 cursor-pointer font-semibold"
                      >
                        + {language === 'ar' ? 'إشعار الرصيد' : 'Classes Left'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('debt_reminder')}
                        className="text-[10px] text-amber-300 hover:underline py-0.5 cursor-pointer font-semibold"
                      >
                        + {language === 'ar' ? 'مطالبة مالية' : 'Balance'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب نص رسالة الواتساب الرسمية...' : 'Type WhatsApp message...'}
                    className="w-full bg-[#111622] border border-white/10 text-white placeholder-slate-500 p-3 rounded-xl text-xs leading-relaxed min-h-[90px] focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[10px] sm:text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'يتم إرسال الرسائل مباشرة إلى هاتف المستلم عبر قناة أكاديمية إتوال الرسمية.'
                      : 'Messages are sent directly to recipient phone via WhatsApp.'}
                  </span>
                  <button
                    type="submit"
                    className="action-btn-coral px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-95 min-h-[42px] cursor-pointer shadow-lg"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'إرسال عبر واتساب الآن' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Live WhatsApp Smartphone Bubble Preview */}
            <div className="lg:col-span-5 bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2 text-amber-300">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-heading text-sm font-bold text-white">
                    {language === 'ar' ? 'معاينة شاشة هاتف المستلم' : 'Phone Preview'}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">Live Sync</span>
              </div>

              {/* WhatsApp Mock Smartphone Container */}
              <div className="bg-[#0b141a] rounded-2xl border border-white/10 overflow-hidden shadow-inner text-xs">
                {/* WhatsApp Green Top Header */}
                <div className="bg-[#1f2c34] p-3 flex items-center justify-between text-white border-b border-white/5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xs">
                      É
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold block truncate text-xs text-white">
                        {customRecipient || (language === 'ar' ? 'المستلم' : 'Recipient')}
                      </span>
                      <span className="text-[10px] text-emerald-400 block font-mono">
                        {customPhone || '+•• •••• ••••'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Chat Area Background */}
                <div className="p-4 min-h-[160px] bg-[#0b141a] flex flex-col justify-end space-y-2">
                  <div className="text-center">
                    <span className="bg-[#182229] text-[10px] text-white/50 px-2.5 py-0.5 rounded-md font-mono">
                      {language === 'ar' ? 'اليوم' : 'Today'}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div className="self-end max-w-[85%] bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-none shadow-md space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium pb-0.5 border-b border-emerald-400/20 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Étoile Ballet Academy</span>
                    </div>
                    <p className="text-xs leading-relaxed break-words text-white/95">
                      {messageBody ||
                        (language === 'ar'
                          ? 'مرحباً! ستظهر هنا معاينة فورية لنص رسالة الواتساب المكتوبة أعلاه قبل إرسالها.'
                          : 'Hello! A live preview of your drafted WhatsApp message will appear here.')}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-white/60 pt-0.5">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Trigger Scenarios */}
          <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
            <div>
              <h4 className="font-heading font-bold text-lg text-white">
                {language === 'ar' ? 'قوالب التنبيهات السريعة' : 'Quick Operational Templates'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'انقر على أي قالب لتعبئة نص الرسالة وتوجيهها للمستلم المحدد أعلاه.'
                  : 'Click a template to load the official notification message for the currently selected recipient.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => handleApplyTemplate('class_reminder')}
                className="p-4 rounded-xl border border-white/5 bg-[#111622] hover:bg-[#1c2333] hover:border-amber-400/40 text-start transition flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[88px]"
              >
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{language === 'ar' ? 'تذكير موعد الحصة' : 'Class Reminder'}</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'إرسال تذكير بموعد وتوقيت الحصة للالتزام بالزي الرسمي.'
                    : 'Dispatch class arrival notification with studio guidance.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('late_arrival')}
                className="p-4 rounded-xl border border-white/5 bg-[#111622] hover:bg-[#1c2333] hover:border-sky-400/40 text-start transition flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[88px]"
              >
                <div className="flex items-center gap-2 text-sky-300 text-xs font-bold mb-2">
                  <CheckCheck className="w-4 h-4 flex-shrink-0" />
                  <span>{language === 'ar' ? 'إشعار وصول' : 'Check-in Notice'}</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'إشعار بوصول الطالب إلى القاعة بعد المسح.'
                    : 'Notify parents a student scanned into the studio.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('quota_warning')}
                className="p-4 rounded-xl border border-white/5 bg-[#111622] hover:bg-[#1c2333] hover:border-amber-400/40 text-start transition flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[88px]"
              >
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-2">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span>{language === 'ar' ? 'تنبيه الرصيد (حصتان فأقل)' : 'Low Classes Warning'}</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'إرسال تذكير تجديد تلقائي لولي الأمر عند وصول رصيد الراقص إلى حصتين أو أقل.'
                    : 'Send renewal reminder when student has 2 or fewer classes.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('debt_reminder')}
                className="p-4 rounded-xl border border-white/5 bg-[#111622] hover:bg-[#1c2333] hover:border-rose-400/40 text-start transition flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[88px]"
              >
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{language === 'ar' ? 'مطالبة تسوية رصيد' : 'Unpaid Balance Notice'}</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'إشعار بالمبالغ المستحقة على الحساب لتسويتها لدى الاستقبال.'
                    : 'Notify parents of unsettled charges on student account.'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('instructor_tardiness')}
                className="p-4 rounded-xl border border-white/5 bg-[#111622] hover:bg-[#1c2333] hover:border-purple-400/40 text-start transition flex flex-col justify-between group cursor-pointer active:scale-[0.98] min-h-[88px]"
              >
                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-2">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>{language === 'ar' ? 'تنبيه هيئة التدريس' : 'Faculty Alert'}</span>
                </div>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'إشعار المدربين بجدول الحصص والتواجد قبل انطلاق الكلاس.'
                    : 'Send operational alerts to instructor staff.'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCH HISTORY & LOGS */}
      {activeTab === 'history' && (
        <div className="bg-[#171d2b] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-amber-300">
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <h4 className="font-heading font-bold text-lg sm:text-xl text-white">
                {language === 'ar' ? 'سجل رسائل الواتساب الصادرة' : 'Dispatched Messages Log'}
              </h4>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={streamSearch}
                  onChange={(e) => setStreamSearch(e.target.value)}
                  placeholder={language === 'ar' ? 'بحث بالاسم، الهاتف...' : 'Search dispatches...'}
                  className="bg-[#111622] border border-white/10 text-white placeholder-slate-500 pl-8 pr-8 rtl:pr-8 rtl:pl-8 py-1.5 rounded-xl text-xs focus:outline-none focus:border-amber-400/50"
                  aria-label={language === 'ar' ? 'بحث الرسائل' : 'Search messages'}
                />
                {streamSearch && (
                  <button onClick={() => setStreamSearch('')} className="absolute right-1.5 rtl:right-auto rtl:left-1.5 top-2 text-slate-500 hover:text-white p-0.5" aria-label="Clear search">✕</button>
                )}
              </div>

              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value)}
                className="bg-[#111622] border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs cursor-pointer focus:outline-none focus:border-amber-400/50"
                aria-label="Event"
              >
                <option value="all">{language === 'ar' ? 'جميع الأحداث' : 'All Events'}</option>
                <option value="class_reminder">{language === 'ar' ? 'تذكير بالحصة' : 'Class Reminder'}</option>
                <option value="quota_warning">{language === 'ar' ? 'تحذير الرصيد' : 'Quota Warning'}</option>
                <option value="debt_reminder">{language === 'ar' ? 'مطالبة دين' : 'Debt Reminder'}</option>
                <option value="late_arrival">{language === 'ar' ? 'حضور متأخر' : 'Late Arrival'}</option>
                <option value="instructor_tardiness">{language === 'ar' ? 'تنبيه المدرب' : 'Instructor Tardiness'}</option>
              </select>
              <span className="text-[11px] font-mono text-slate-500">{filteredQueue.length}</span>
              <ViewSwitcher moduleKey="openwa-history" modes={['cards', 'rows']} value={{ mode: waView.mode, density: waView.density }} onChange={(p) => { waView.setMode(p.mode); waView.setDensity(p.density); }} />
              <button
                onClick={() => exportCsv(`whatsapp-log-${new Date().toISOString().split('T')[0]}`, ['recipientName', 'recipientPhone', 'triggerEvent', 'status', 'timestamp'], filteredQueue.map((m) => ({
                  recipientName: m.recipientName, recipientPhone: m.recipientPhone, triggerEvent: m.triggerEvent, status: m.status, timestamp: m.timestamp,
                })))}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:text-white flex items-center gap-1.5"
                title={language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              >
                <Download className="w-3.5 h-3.5" /><span>CSV</span>
              </button>
              {(streamSearch || streamFilter !== 'all') && (
                <button onClick={() => { setStreamSearch(''); setStreamFilter('all'); }} className="text-[11px] text-slate-400 hover:text-rose-300 underline px-1">
                  {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                </button>
              )}
            </div>
          </div>

          <div className={waView.mode === 'rows' ? 'rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5' : 'space-y-3'}>
            {filteredQueue.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 italic">
                {language === 'ar' ? 'لا توجد رسائل مسجلة حالياً.' : 'No dispatched messages match your search criteria.'}
              </div>
            ) : waView.mode === 'rows' ? (
              filteredQueue.map((msg) => (
                <div key={msg.id} className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/[0.02] transition">
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-white truncate">{msg.recipientName}</span>
                    <span className="block text-[11px] text-slate-500 truncate" dir="ltr">{msg.recipientPhone} • {msg.triggerEvent}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{msg.timestamp}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-slate-300 flex-shrink-0">{msg.status}</span>
                </div>
              ))
            ) : (
              filteredQueue.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-white/5 bg-[#111622] hover:bg-[#1c2333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm transition"
                >
                  <div className="flex items-start gap-3 w-full sm:w-auto min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Send className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">{msg.recipientName}</span>
                        <span className="font-mono text-slate-400 text-[10px]">({msg.recipientPhone})</span>
                        <span className="status-pill-amber font-mono capitalize text-[10px]">
                          {msg.triggerEvent.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1.5 leading-relaxed break-words">{msg.body}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 text-[10px] text-slate-400 shrink-0 gap-1">
                    <span className="font-mono">{msg.timestamp}</span>
                    <span className="status-pill-emerald">
                      {msg.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
