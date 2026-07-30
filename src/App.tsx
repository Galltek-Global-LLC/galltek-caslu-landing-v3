import { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle, X, ArrowUpRight, BookOpen, Radio, Copy, LineChart, Users, BadgeCheck, MessageCircle } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { captureUTMs, getUTMs } from './lib/utm-tracker';
import { submitToGoogleAppsScript } from './lib/google-apps-script';
import { generateTransactionId } from './lib/data-hasher';
import { trackMetaEvent, buildTrackedRedirectUrl } from './lib/meta-tracking';
import {
  trackFormStart,
  trackFieldCompleted,
  trackFormSuccess,
  trackFormError,
  setupFormAbandonmentTracking,
  setupPageEngagementTracking,
} from './lib/analytics';

const META_PIXEL_ID = '1336546998650554';
const FORM_NAME = 'caslu-captura-v3';

interface AppProps {
  redirectUrl: string;
}

const chips = [
  { icon: BookOpen, label: 'Conteúdos diários' },
  { icon: Radio, label: 'Operações ao vivo' },
  { icon: Copy, label: 'Copy Trade' },
  { icon: LineChart, label: 'Análises diárias' },
  { icon: Users, label: 'Comunidade exclusiva' },
];

const feedbackImages = [
  '/FEEDBACK15.PNG',
  '/FEEDBACK17.PNG',
  '/FEEDBACK7.PNG',
  '/FEEDBACK181.PNG',
  '/FEEDBACK9.PNG',
  '/FEEDBACK191.PNG',
  '/FEEDBACK15.PNG',
  '/FEEDBACK20.PNG',
];

function App({ redirectUrl }: AppProps) {
  const REDIRECT_URL = redirectUrl;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [formStarted, setFormStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    captureUTMs();
  }, []);

  // PageView com eventID (Pixel client + CAPI server, deduplicado).
  // O fbq('track', 'PageView') foi removido do index.html para evitar duplo disparo.
  useEffect(() => {
    trackMetaEvent({
      eventName: 'PageView',
      customData: { content_name: FORM_NAME },
    });
  }, []);

  useEffect(() => {
    const cleanup = setupPageEngagementTracking('landing-v3', 10);
    return cleanup;
  }, []);

  const getFilledFields = useCallback(() => {
    const fields: string[] = [];
    if (name) fields.push('nome');
    if (email) fields.push('email');
    if (phone) fields.push('phone');
    return fields;
  }, [name, email, phone]);

  useEffect(() => {
    const cleanup = setupFormAbandonmentTracking(FORM_NAME, getFilledFields);
    return cleanup;
  }, [getFilledFields]);

  const markFormStarted = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackFormStart(FORM_NAME);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    if (!phone || !isValidPhoneNumber(phone)) {
      setPhoneError('Número de WhatsApp inválido');
      return;
    }

    isSubmittingRef.current = true;
    setError('');
    setPhoneError('');
    setLoading(true);

    const transactionId = generateTransactionId();
    const utms = getUTMs();

    try {
      const success = await submitToGoogleAppsScript(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          source: 'whatsapp',
        },
        utms,
        transactionId,
      );

      if (!success) throw new Error('Falha no envio');

      trackFormSuccess(FORM_NAME, transactionId, utms, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      // Meta Pixel: evento Lead com deduplicação via eventID.
      // Sem value/currency: enviar valor mock prejudica qualidade dos dados na Meta.
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
          content_name: FORM_NAME,
          content_category: 'whatsapp',
          eventID: transactionId,
        });
      }

      setSubmitted(true);
      setLoading(false);
      isSubmittingRef.current = false;

      setTimeout(() => {
        window.location.href = buildTrackedRedirectUrl(REDIRECT_URL);
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      trackFormError(FORM_NAME, errorMsg);
      setError('Ocorreu um erro. Tente novamente.');
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };


  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActiveIndex((prev) => Math.min(feedbackImages.length - 1, prev + 1));
      } else {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const card = scrollRef.current.children[activeIndex] as HTMLElement;
      if (card) {
        scrollRef.current.scrollTo({ left: card.offsetLeft - 20, behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % feedbackImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#080b12] text-white flex flex-col items-center justify-center px-5 pt-8 pb-8 sm:py-16 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg mx-auto flex flex-col items-center text-center gap-6 sm:gap-10">
        {/* Headline + Subtitle */}
        <div>
          <div className="inline-flex items-center gap-2 mb-3 sm:mb-5 px-3 py-1 rounded-full border border-amber-600/30 bg-amber-600/[0.06]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
            </span>
            <span className="text-[0.65rem] sm:text-[0.7rem] font-semibold tracking-[0.18em] text-amber-300/90 uppercase">Análises ao vivo</span>
          </div>
          <h1 className="text-[1.85rem] sm:text-5xl font-extrabold leading-[1.15] tracking-tight mb-3 sm:mb-5 sm:w-[37rem] sm:max-w-none sm:mx-auto [text-shadow:0_0_40px_rgba(184,134,11,0.3)]" suppressHydrationWarning>
            <span className="bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#e8c876] bg-clip-text text-transparent">Pare de operar</span>{' '}sem saber
            <br className="hidden sm:block" />
            {' '}
            <span className="relative inline-block">
              <span>a intenção do preço</span>
              <span aria-hidden="true" className="absolute left-0 -bottom-1 sm:-bottom-1.5 h-[3px] sm:h-[4px] w-full rounded-full bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#d4af37]" />
            </span>
            .
          </h1>
          <p className="text-gray-400 text-[0.95rem] sm:text-base leading-relaxed max-w-[21rem] sm:max-w-md mx-auto">
            Participe <span className="text-white font-medium">gratuitamente</span> das análises ao vivo e veja como um trader experiente enxerga oportunidade no gráfico.
          </p>

          {/* Desktop: static pills */}
          <div className="hidden sm:flex flex-wrap justify-center gap-3 mt-4">
            {chips.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-600/25 bg-gradient-to-b from-amber-600/[0.08] to-transparent text-sm text-amber-200/90 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                <Icon className="w-4 h-4 text-amber-500" strokeWidth={2.25} />
                {label}
              </span>
            ))}
          </div>

          {/* Mobile: infinite marquee */}
          <div className="sm:hidden overflow-hidden mt-5 mask-fade py-2" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
            <div className="flex gap-3 animate-marquee">
              {[...Array(6)].map((_, setIdx) => (
                <div key={setIdx} className="flex gap-3 shrink-0">
                  {chips.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-600/25 bg-gradient-to-b from-amber-600/[0.08] to-transparent text-sm text-amber-200/90 whitespace-nowrap backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    >
                      <Icon className="w-4 h-4 text-amber-500" strokeWidth={2.25} />
                      {label}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Image Carousel */}
        <div className="w-full relative">
          {/* Authenticity header */}
          <div className="relative z-20 flex flex-col items-center -mb-[14px] sm:-mb-[15px]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/40 bg-[#0c1019]/95 backdrop-blur-md shadow-[0_4px_22px_-6px_rgba(16,185,129,0.55)]">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2.5} />
              <span className="text-[0.65rem] sm:text-[0.7rem] font-semibold tracking-[0.18em] text-emerald-200/90 uppercase">Depoimentos reais</span>
            </div>
          </div>

          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-hidden px-4"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {feedbackImages.map((img, i) => (
                <div
                  key={i}
                  className={`w-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                    i === activeIndex ? 'opacity-100 scale-100' : 'opacity-30 scale-95'
                  }`}
                >
                  <div className="p-2 rounded-2xl border border-gray-700/50 bg-white/[0.02]">
                    <img
                      src={img}
                      alt={`Feedback ${i + 1}`}
                      className="max-w-full max-h-[70vh] rounded-xl object-contain block"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3 sm:mt-4">
            {feedbackImages.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-6 bg-amber-500' : 'w-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => {
              if (submitted) {
                setSubmitted(false);
                setName('');
                setEmail('');
                setPhone('');
              }
              setError('');
              setShowModal(true);
              // InitiateCheckout deduplicado (Pixel + CAPI mesmo eventID).
              trackMetaEvent({
                eventName: 'InitiateCheckout',
                customData: {
                  content_name: FORM_NAME,
                  content_category: 'whatsapp',
                },
              });
            }}
            className="group flex items-center gap-0 rounded-full p-2 sm:p-1.5 bg-[#111827] border border-amber-600/40 transition-all duration-300 hover:scale-[1.03] shadow-lg shadow-amber-700/25 hover:border-amber-500/70"
          >
            <span className="cta-shine relative overflow-hidden bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 text-white font-bold text-[0.78rem] sm:text-sm tracking-wide px-5 sm:px-7 py-3.5 sm:py-3 rounded-full whitespace-nowrap">
              <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">PARTICIPAR GRATUITAMENTE</span>
            </span>
            <span className="flex items-center justify-center w-12 h-12 sm:w-11 sm:h-11 bg-amber-600 rounded-full ml-2 group-hover:bg-amber-500 transition-colors">
              <ArrowUpRight className="w-[1.35rem] h-[1.35rem] sm:w-5 sm:h-5 text-white arrow-nudge" strokeWidth={2.75} />
            </span>
          </button>
          <p className="text-gray-500 text-xs">Vagas gratuitas limitadas - Garanta a sua</p>
        </div>

        {/* Signature */}
        <div className="flex flex-col items-center mt-2 mb-4">
          <div className="flex flex-col items-center mb-3">
            <p className="text-gray-300 text-sm sm:text-base leading-snug text-center">
              Poucos traders operam com estratégia de verdade,<br />
              e <span className="text-white font-semibold">essa é a sua chance de ser um deles.</span>
            </p>
            <svg className="w-52 h-[10px] mt-0.5 ml-6" viewBox="0 0 200 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7Q20 2 40 6Q60 2 80 6Q100 2 120 6Q140 2 160 6Q180 3 197 5" stroke="url(#underline-grad)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <defs>
                <linearGradient id="underline-grad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#b8860b" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#b8860b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#b8860b" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <img
            src="/trinity-logo.jpg"
            alt="Trinity Trader Capital"
            className="w-32 sm:w-40 rounded-2xl shadow-[0_0_50px_-8px_rgba(184,134,11,0.45)] ring-1 ring-amber-700/20"
          />
          <p className="text-gray-700 text-[0.58rem] sm:text-[0.62rem] leading-relaxed text-center max-w-xs sm:max-w-md mt-4 px-2">
            <span className="text-gray-600 font-medium">Aviso importante:</span> envolve risco. Não há garantia de lucro. Resultados variam conforme mercado, execução e gestão.
          </p>
        </div>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !loading && setShowModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#0c1019] border border-amber-600/25 rounded-3xl p-7 sm:p-9 animate-modal shadow-[0_0_60px_-10px_rgba(184,134,11,0.4)]">
            <button
              onClick={() => !loading && setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-emerald-500/15 ring-1 ring-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">
                  <span className="bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#e8c876] bg-clip-text text-transparent">Inscrição confirmada!</span>
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  Falta só <span className="text-white font-semibold">um passo</span>: entre agora no grupo do WhatsApp para receber o aviso das análises ao vivo e o material exclusivo.
                </p>
                <a
                  href={buildTrackedRedirectUrl(REDIRECT_URL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full flex items-center justify-center gap-2 rounded-full p-1.5 bg-[#111827] border border-emerald-500/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-emerald-600/25 hover:border-emerald-400/70"
                >
                  <span className="cta-shine relative overflow-hidden w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 text-white font-bold text-sm tracking-wide px-5 py-3 rounded-full whitespace-nowrap">
                    <MessageCircle className="relative z-10 w-4 h-4" strokeWidth={2.75} />
                    <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">ENTRAR NO GRUPO DO WHATSAPP</span>
                  </span>
                </a>
                <p className="text-gray-500 text-xs mt-3">As vagas são limitadas — não perca seu lugar.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl sm:text-2xl font-extrabold mb-2 tracking-tight">
                    <span className="bg-gradient-to-r from-[#b8860b] via-[#d4af37] to-[#e8c876] bg-clip-text text-transparent">Garanta</span>{' '}sua vaga gratuita
                  </h2>
                  <p className="text-gray-500 text-sm">Preencha abaixo para participar.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1.5">Nome</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => { setName(e.target.value); markFormStarted(); }}
                      onBlur={(e) => { if (e.target.value) trackFieldCompleted('nome', FORM_NAME); }}
                      placeholder="Seu nome completo"
                      className="w-full px-4 py-3.5 bg-[#0e1420] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-600/40 focus:border-amber-700 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); markFormStarted(); }}
                      onBlur={(e) => { if (e.target.value) trackFieldCompleted('email', FORM_NAME); }}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3.5 bg-[#0e1420] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-600/40 focus:border-amber-700 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1.5">WhatsApp</label>
                    <PhoneInput
                      defaultCountry="BR"
                      value={phone}
                      onChange={(value) => {
                        setPhone(value || '');
                        setPhoneError('');
                        markFormStarted();
                      }}
                      onBlur={() => {
                        if (phone && phone.length > 8) {
                          trackFieldCompleted('phone', FORM_NAME);
                          if (!isValidPhoneNumber(phone)) {
                            setPhoneError('Número de WhatsApp inválido');
                          }
                        }
                      }}
                      disabled={loading}
                      className={`phone-input-caslu-v2 ${phoneError ? 'phone-input-error' : ''}`}
                      placeholder="(11) 99999-9999"
                      id="phone"
                      name="phone"
                      inputProps={{
                        id: 'phone',
                        name: 'phone',
                        required: true,
                      }}
                    />
                    {phoneError && (
                      <p className="text-red-400 text-xs mt-1.5">{phoneError}</p>
                    )}
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group w-full flex items-center justify-center gap-2 rounded-full p-1.5 bg-[#111827] border border-amber-600/40 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-amber-700/25 hover:border-amber-500/70 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className={`cta-shine relative overflow-hidden w-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 text-white font-bold text-sm tracking-wide px-5 py-3 rounded-full whitespace-nowrap ${loading ? 'opacity-80' : ''}`}>
                      <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">
                        {loading ? 'ENVIANDO...' : 'PARTICIPAR GRATUITAMENTE'}
                      </span>
                    </span>
                  </button>

                  <p className="text-gray-600 text-xs text-center">
                    Seus dados estão seguros. Não enviamos spam.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
