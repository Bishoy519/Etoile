import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle, Clock, Award, Sparkles } from 'lucide-react';

interface ProgramModalProps {
  programKey: string | null;
  onClose: () => void;
  onEnroll: (programKey: string) => void;
}

export const ProgramModal: React.FC<ProgramModalProps> = ({ programKey, onClose, onEnroll }) => {
  const { language, portalContent } = useApp();

  if (!programKey) return null;

  const matchedProgram = portalContent.programs.find(
    (p) => p.key === programKey || p.id === programKey
  );

  const fallbackContent: Record<string, any> = {
    classical: {
      title: language === 'ar' ? 'الباليه الكلاسيكي' : 'Classical Ballet',
      subtitle: language === 'ar' ? 'منهج كونسرفتوار باريس وفاغانوفا' : 'Conservatory Technique & Repertoire',
      desc: language === 'ar'
        ? 'منهج كلاسيكي شامل ومكثف مبني على أصول مدرسة فاغانوفا الروسية وأوبرا باريس. يطور الراقصون الاستقامة التشريحية، الدوران المتكامل (turnout)، وحركات البوانت الرفيعة والشراكة الكلاسيكية (Pas de Deux).'
        : 'Comprehensive classical ballet conservatory curriculum built on Russian Vaganova and French Paris Opéra methodologies. Dancers cultivate impeccable turnout, anatomical elongation, épaulement, and pointe bravura, paired with classical partnering (pas de deux) and variations.',
      syllabus: [
        language === 'ar' ? 'تمارين البار (Barre): المحاذاة الدقيقة وتطوير التقوس ودوران القدم' : 'Barre Work: Precision placement, rond de jambe en l\'air, grand battement',
        language === 'ar' ? 'تمارين الوسط والقفزات (Center & Allegro): الدوران والقفزات الهوائية المعقدة' : 'Center & Allegro: Pirouettes en dedans/en dehors, grand jeté entrelacé, batterie',
        language === 'ar' ? 'أدوار البوانت والمقطوعات العالمية: بحيرة البجع، جيزيل، دون كيشوت' : 'Pointe & Variations: Classical repertoire from Swan Lake, Giselle, Don Quixote',
        language === 'ar' ? 'الرقص الثنائي (Pas de Deux): الرفعات الهوائية والدوران المدعوم' : 'Classical Pas de Deux: Partnering, promenades, overhead lifts, and supported pirouettes',
      ],
      schedule: language === 'ar' ? 'من الإثنين إلى الجمعة: 4:00 م – 7:30 م مع ماستركلاس السبت' : 'Monday – Friday: 4:00 PM – 7:30 PM & Saturday Masterclass',
      prereqs: language === 'ar' ? 'سن 12 عاماً فما فوق أو اجتياز تجربة أداء المستوى' : 'Ages 12+ or Audition Placement (Minimum 3 years classical foundation)',
    },
    contemporary: {
      title: language === 'ar' ? 'الرقص المعاصر' : 'Contemporary Dance',
      subtitle: language === 'ar' ? 'التعبير الحركي وديناميكيات الأرض' : 'Modern Expression & Floorwork Dynamics',
      desc: language === 'ar'
        ? 'دراسة متعمقة لهندسة الحركة الحديثة، تقنيات التحرر الأرضي (Floor Release)، وحركات لغة الجاغا (Gaga). يربط البرنامج بين الأساس الكلاسيكي الصارم والانطلاق التعبيري الحركي.'
        : 'A rigorous exploration of contemporary architecture, floor release techniques, Gaga-inspired physical inquiry, and neoclassical partnering. This program bridges traditional classical foundation with athletic expressive choreography.',
      syllabus: [
        language === 'ar' ? 'تقنيات الأرض والتنقل الحركي الانسيابي والحلزوني' : 'Floorwork & Release: Gyrokinesis principles, gravity weight transfer, and floor spirals',
        language === 'ar' ? 'التكوين النيوكلاسيكي والخطوط غير المتماثلة والتوازن الخارجي' : 'Neoclassical Form: Off-center balance, asymmetric lines, dynamic phrasing',
        language === 'ar' ? 'الارتجال وتصميم اللوحات التعبيرية الخاصة' : 'Improvisation & Composition: Structural creation, site-specific choreography',
        language === 'ar' ? 'الشراكة المعاصرة: تقاسم الأوزان والرفعات الديناميكية' : 'Partnering Dynamics: Weight sharing, counter-balances, and non-traditional lifts',
      ],
      schedule: language === 'ar' ? 'الثلاثاء والخميس والسبت: 5:00 م – 8:30 م' : 'Tuesday, Thursday & Saturday: 5:00 PM – 8:30 PM',
      prereqs: language === 'ar' ? 'سن 14 عاماً فما فوق مع خلفية حركية مسبقة' : 'Ages 14+ with strong technical foundation in ballet or modern',
    },
    youth: {
      title: language === 'ar' ? 'برنامج الناشئين' : 'Youth Program',
      subtitle: language === 'ar' ? 'تأسيس المهارات الحركية والانضباط الفني' : 'Foundations of Artistry & Motor Discipline',
      desc: language === 'ar'
        ? 'بيداغوجيا تربوية وحركية آمنة مصممة خصيصاً للراقصين الصغار من سن 5 حتى 11 عاماً. تركز على التوازن التشريحي السليم، الإيقاع الموسيقي، المرونة، وحب رواية القصص عبر الباليه.'
        : 'Structured, anatomically safe pedagogy designed for young dancers ages 5 through 11. Emphasizes postural alignment, musicality, coordination, flexibility, and the joyous discipline of classical ballet storytelling.',
      syllabus: [
        language === 'ar' ? 'التمهيد للباليه ومحاذاة القوام والوعي المكاني' : 'Pre-Ballet & Alignment: Anatomical placement, core stability, spatial awareness',
        language === 'ar' ? 'الإيقاع الموسيقي وحساسية النغمات الكلاسيكية' : 'Musicality & Rythmique: Polonaise, mazurka rhythms, phrasing sensitivity',
        language === 'ar' ? 'أساسيات البار: الوضعيات الخمسة، ثني الركبتين ومد القدمين' : 'Foundational Barre: First through fifth positions, tendu, plié mechanics',
        language === 'ar' ? 'أداء الفرقة الاستعراضية للناشئين والأعمال المسرحية' : 'Performance Ensemble: Junior showcase production pieces and stagecraft',
      ],
      schedule: language === 'ar' ? 'الأربعاء 3:30 م – 5:00 م والسبت 9:30 ص – 12:00 م' : 'Wednesday 3:30 PM – 5:00 PM & Saturday 9:30 AM – 12:00 PM',
      prereqs: language === 'ar' ? 'للأعمار بين 5 و 11 عاماً (لا يشترط تدريب مسبق)' : 'Ages 5–11. No formal prior training required (placement session held)',
    },
  };

  const preset = fallbackContent[programKey] || fallbackContent.classical;

  const content = {
    title: matchedProgram
      ? (language === 'ar' ? matchedProgram.titleAr : matchedProgram.title)
      : preset.title,
    subtitle: preset.subtitle,
    desc: matchedProgram
      ? (language === 'ar' ? matchedProgram.descriptionAr : matchedProgram.description)
      : preset.desc,
    syllabus: (matchedProgram && (language === 'ar' ? matchedProgram.featuresAr : matchedProgram.features)?.length)
      ? (language === 'ar' ? matchedProgram.featuresAr : matchedProgram.features)
      : preset.syllabus,
    schedule: matchedProgram?.schedule || preset.schedule,
    prereqs: matchedProgram?.ageGroup || preset.prereqs,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-[#101314] w-full max-w-2xl rounded-2xl overflow-hidden border border-brand-gold/60 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_50px_rgba(226,190,104,0.25)] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-brand-gold/20 flex items-center justify-between bg-[#14181a]">
          <div className="flex items-center gap-3">
            <img
              src="/etoile-wordmark-logo.png"
              alt="Étoile Ballet Academy"
              className="h-10 w-auto object-contain drop-shadow"
            />
            <div className="border-l border-brand-gold/30 pl-3">
              <h3 className="font-serif text-2xl gold-text-gradient uppercase tracking-wider">{content.title}</h3>
              <span className="text-xs text-brand-gold/70">{content.subtitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-brand-gold/70 hover:text-brand-gold-light w-8 h-8 rounded-full border border-brand-gold/30 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm text-brand-muted/90 font-light leading-relaxed">
          <p className="leading-relaxed">{content.desc}</p>

          <div className="rounded-xl border border-brand-gold/20 p-5 bg-[#090c0d]">
            <h4 className="font-serif text-lg text-brand-gold uppercase tracking-wider mb-3">
              {language === 'ar' ? 'مفردات المنهج والتدريب' : 'Curriculum Syllabus'}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {(content.syllabus as string[]).map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-brand-gold mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-brand-gold/20 bg-[#090c0d]">
              <div className="flex items-center gap-2 text-brand-gold mb-1 text-[11px] uppercase tracking-wider font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'المواعيد والساعات' : 'Schedule & Hours'}</span>
              </div>
              <p className="text-xs text-brand-muted/80">{content.schedule}</p>
            </div>

            <div className="p-4 rounded-xl border border-brand-gold/20 bg-[#090c0d]">
              <div className="flex items-center gap-2 text-brand-gold mb-1 text-[11px] uppercase tracking-wider font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'شروط الالتحاق' : 'Prerequisites'}</span>
              </div>
              <p className="text-xs text-brand-muted/80">{content.prereqs}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-gold/20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#14181a]">
          <span className="text-xs text-brand-muted/70">
            {language === 'ar' ? 'التسجيل مفتوح لموسم 2026' : 'Rolling admissions for the 2026 season.'}
          </span>
          <button
            onClick={() => onEnroll(programKey)}
            className="gold-btn w-full sm:w-auto px-7 py-3 rounded-lg text-black font-serif text-sm font-semibold tracking-wider"
          >
            {language === 'ar' ? 'التسجيل في هذا البرنامج' : 'Enroll in This Program'}
          </button>
        </div>
      </div>
    </div>
  );
};
