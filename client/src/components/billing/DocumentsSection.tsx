import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, errMsg } from '../../utils/api';
import { FileText, Upload, Download, Trash2, Loader2, ShieldCheck } from 'lucide-react';

interface Doc {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

const KINDS = ['consent', 'medical', 'other'] as const;
const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 4 * 1024 * 1024;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      resolve(s.includes(',') ? s.split(',').pop()! : s);
    };
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

export const DocumentsSection: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { language, showToast } = useApp();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<string>('consent');
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/students/${studentId}/documents`);
      setDocs(data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      showToast(language === 'ar' ? 'الملف كبير' : 'File too large', language === 'ar' ? 'الحد الأقصى 4MB (PDF/JPG/PNG).' : 'Max 4MB (PDF/JPG/PNG).', 'error');
      return;
    }
    setUploading(true);
    try {
      const base64 = await toBase64(file);
      await api.post(`/api/students/${studentId}/documents`, { kind, fileName: file.name, mimeType: file.type || 'application/octet-stream', base64 });
      showToast(language === 'ar' ? 'تم الرفع' : 'Uploaded', file.name, 'success');
      load();
    } catch (e) {
      showToast(language === 'ar' ? 'فشل الرفع' : 'Upload failed', errMsg(e), 'error');
    } finally {
      setUploading(false);
    }
  };

  const download = async (d: Doc) => {
    setBusyId(d.id);
    try {
      const { data: body } = await api.get(`/api/students/documents/${d.id}/file`);
      const a = document.createElement('a');
      a.href = `data:${body.mimeType};base64,${body.base64}`;
      a.download = body.fileName;
      a.click();
    } catch (e) {
      showToast(language === 'ar' ? 'تعذر التنزيل' : 'Download failed', errMsg(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (d: Doc) => {
    setBusyId(d.id);
    try {
      await api.delete(`/api/students/documents/${d.id}`);
      setDocs((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      showToast(language === 'ar' ? 'تعذر الحذف' : 'Delete failed', errMsg(e), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const kindBadge = (k: string) =>
    k === 'consent' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
    : k === 'medical' ? 'text-rose-300 border-rose-500/40 bg-rose-500/10'
    : 'text-slate-300 border-white/15 bg-white/5';

  return (
    <section id="family-documents" aria-label={language === 'ar' ? 'المستندات' : 'Documents'} className="gold-card rounded-2xl p-5 sm:p-6 space-y-4 scroll-mt-24">
      <h3 className="font-serif text-xl text-[#fdf1c2] flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-gold" />
        {language === 'ar' ? 'الموافقات والمستندات الطبية' : 'Consents & Medical Documents'}
      </h3>
      <p className="text-[11px] text-brand-muted/70">
        {language === 'ar'
          ? 'ارفعي موافقة ولي الأمر أو التقارير الطبية (PDF/JPG/PNG حتى 4MB). تظهر فقط لحساب عائلتك وطاقم الأكاديمية.'
          : 'Upload guardian consent or medical reports (PDF/JPG/PNG up to 4MB). Visible only to your family and academy staff.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="form-gold-input px-3 py-2.5 rounded-xl text-xs bg-[#101314]"
          aria-label={language === 'ar' ? 'نوع المستند' : 'Document kind'}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <label className="gold-btn px-5 py-2.5 rounded-xl text-black text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {language === 'ar' ? 'رفع مستند' : 'Upload document'}
          <input
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={uploading}
            onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
          />
        </label>
      </div>

      {loading ? (
        <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
      ) : docs.length === 0 ? (
        <p className="text-xs text-brand-muted/60 border border-dashed border-brand-gold/20 rounded-xl py-6 text-center">
          {language === 'ar' ? 'لا مستندات بعد.' : 'No documents yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-brand-gold/20 bg-black/40 text-xs">
              <FileText className="w-4 h-4 text-brand-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white truncate">{d.fileName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${kindBadge(d.kind)}`}>{d.kind}</span>
                </div>
                <div className="text-[11px] text-brand-muted/60 font-mono mt-0.5" dir="ltr">
                  {(d.size / 1024).toFixed(0)} KB • {new Date(d.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => download(d)} disabled={busyId === d.id} className="p-2 rounded-lg border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 disabled:opacity-50" aria-label={`Download ${d.fileName}`}>
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(d)} disabled={busyId === d.id} className="p-2 rounded-lg border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50" aria-label={`Delete ${d.fileName}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
