import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { Check, Shield, Zap, LineChart, Sparkles, ArrowRight, Globe, Mail, Github } from 'lucide-react';

export default function LandingPage() {
  // English-only landing page
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [yearly, setYearly] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingPlans(true);
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('id,name,description,price_monthly,price_yearly,currency,features,is_active')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
        if (error) throw error;
        if (!active) return;
        setPlans(data || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load pricing plans', e);
      } finally {
        if (active) setLoadingPlans(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const displayPlans = useMemo(() => {
    // Ensure Growth highlighted by order if exists
    const growthIdx = plans.findIndex(p => (p.name || '').toLowerCase() === 'growth');
    if (growthIdx > -1) {
      const cloned = [...plans];
      const [g] = cloned.splice(growthIdx, 1);
      cloned.splice(1, 0, g);
      return cloned;
    }
    return plans;
  }, [plans]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/80 border-b border-slate-200/60">
        <div className="app-container">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold">C</div>
              <span className="text-lg font-semibold tracking-tight">Catloog</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a href="#features" className="hover:text-slate-900 text-slate-600 transition">Features</a>
              <a href="#pricing" className="hover:text-slate-900 text-slate-600 transition">Pricing</a>
              <a href="#faq" className="hover:text-slate-900 text-slate-600 transition">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-4 h-10 inline-flex items-center rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition">
                Sign in
              </Link>
              <Link to="/register" className="px-4 h-10 inline-flex items-center rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_60rem_at_120%_-10%,rgba(20,184,166,0.15),transparent)]" />
        <div className="app-container py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Sparkles className="h-3.5 w-3.5" /> New: Modern dashboard UI
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Build your store’s catalog and storefront in minutes
              </h1>
              <p className="mt-4 text-slate-600 text-lg">
                Catloog helps you manage products, orders, and a beautiful storefront powered by Supabase & React.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="inline-flex items-center justify-center h-12 px-6 rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-sm font-medium">
                  Start free <ArrowRight className="h-4 w-4 ms-2" />
                </Link>
                <Link to="/store/demo" className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium">
                  Live demo
                </Link>
              </div>
              {/* Trust badges / stats */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                  <Shield className="h-5 w-5 text-teal-600" /> Secure by Supabase
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                  <Zap className="h-5 w-5 text-teal-600" /> Fast Vite + React
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center gap-3">
                  <LineChart className="h-5 w-5 text-teal-600" /> Analytics-ready
                </div>
              </div>
            </div>
            {/* Visual */}
            <div className="relative">
              <div className="relative rounded-2xl border border-slate-200 bg-white shadow-xl/30 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1600&auto=format&fit=crop" alt="Showcase" className="w-full h-80 object-cover" />
              </div>
              <div className="absolute -bottom-6 -end-6 hidden md:block w-40 h-40 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="app-container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Everything you need to sell</h2>
          <p className="mt-3 text-slate-600">Powerful features designed for modern merchants and small businesses.</p>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Beautiful dashboard', desc: 'Manage products, orders and analytics with a clean modern UI.' },
            { title: 'Storefront ready', desc: 'Your public store with theming and WhatsApp ordering.' },
            { title: 'Supabase backend', desc: 'Auth, Postgres, and Storage out of the box. Secure and scalable.' },
            { title: 'Fast performance', desc: 'Vite + React + Tailwind for a blazing-fast, responsive experience.' },
            { title: 'Internationalization', desc: 'i18n-ready foundation if needed in the future.' },
            { title: 'No vendor lock-in', desc: 'Own your data with an open stack and clean TypeScript code.' },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition">
              <div className="h-10 w-10 rounded-lg bg-teal-600/10 text-teal-700 flex items-center justify-center mb-4">
                <Check className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 border-y border-slate-200/70">
        <div className="app-container py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Simple pricing</h2>
            <p className="mt-3 text-slate-600">Start free. Upgrade when you grow.</p>
            <div className="mt-6 inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
              <button
                className={`h-9 px-4 text-sm font-medium rounded-lg ${!yearly ? 'bg-teal-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setYearly(false)}
              >Monthly</button>
              <button
                className={`h-9 px-4 text-sm font-medium rounded-lg ${yearly ? 'bg-teal-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                onClick={() => setYearly(true)}
              >Yearly <span className="ml-1 text-[11px] align-super">(save)</span></button>
            </div>
          </div>

          <div className="mt-10">
            {loadingPlans ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[0, 1, 2].map(i => (
                  <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-white animate-pulse h-56" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {displayPlans.map((p, idx) => {
                  const isRecommended = (p.name || '').toLowerCase() === 'growth' || idx === 1;
                  const monthly = p.price_monthly != null ? Number(p.price_monthly) : null;
                  const yearlyPrice = p.price_yearly != null ? Number(p.price_yearly) : null;
                  const priceText = yearly
                    ? (yearlyPrice != null ? `$${yearlyPrice}/yr` : 'Contact sales')
                    : (monthly != null ? `$${monthly}/mo` : 'Contact sales');
                  const feats: string[] = Array.isArray(p.features) ? p.features : [];
                  return (
                    <div key={p.id || p.name} className={`p-6 rounded-2xl border ${isRecommended ? 'border-teal-300 ring-1 ring-teal-200 shadow-md' : 'border-slate-200'} bg-white`}>
                      <h3 className="font-semibold">{p.name}</h3>
                      <div className="mt-2 text-3xl font-extrabold">{priceText}</div>
                      {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
                      {feats.length > 0 && (
                        <ul className="mt-4 space-y-2 text-sm text-slate-600">
                          {feats.slice(0, 6).map((f) => (
                            <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" /> {f.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      )}
                      <Link to="/register" className={`mt-6 inline-flex items-center justify-center h-11 px-5 rounded-xl w-full font-medium ${isRecommended ? 'bg-teal-600 text-white hover:bg-teal-700' : 'border border-slate-200 hover:bg-slate-50'}`}>
                        Choose {p.name}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="app-container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <p className="mt-3 text-slate-600">Everything you need to know.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {[
            { q: 'Do I need a backend?', a: 'No. Supabase is already integrated for Auth, Database, and Storage.' },
            { q: 'Is it mobile friendly?', a: 'Yes. The landing, dashboard and storefront are fully responsive.' },
            { q: 'Can I use my domain?', a: 'Yes. You can configure a custom domain for your storefront.' },
            { q: 'Does it support Arabic?', a: 'The app is now English-only.' },
          ].map(item => (
            <div key={item.q} className="p-6 rounded-2xl border border-slate-200 bg-white">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-slate-600 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="app-container">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-teal-600 to-emerald-500 text-white px-8 py-12">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">Launch your store today</h3>
                <p className="mt-2 text-white/90">Create your account, add products, and share your storefront link.</p>
              </div>
              <div className="flex justify-start lg:justify-end gap-3">
                <Link to="/register" className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-white text-teal-700 font-semibold shadow-sm hover:bg-slate-50">
                  Get Started
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center h-12 px-6 rounded-xl ring-1 ring-inset ring-white/70 hover:bg-white/10">
                  Sign in
                </Link>
              </div>
            </div>
            <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="app-container py-12">
          <div className="grid md:grid-cols-4 gap-8 text-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">C</div>
                <span className="text-base font-semibold tracking-tight">Catloog</span>
              </div>
              <p className="mt-3 text-slate-600">A simple platform to manage your online store.</p>
              <div className="mt-4 flex items-center gap-3 text-slate-600">
                <a href="#" aria-label="Website" className="hover:text-slate-900"><Globe className="h-5 w-5" /></a>
                <a href="#" aria-label="GitHub" className="hover:text-slate-900"><Github className="h-5 w-5" /></a>
                <a href="mailto:hello@example.com" aria-label="Email" className="hover:text-slate-900"><Mail className="h-5 w-5" /></a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Product</h4>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li><a href="#features" className="hover:text-slate-900">Features</a></li>
                <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Resources</h4>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li><a href="#" className="hover:text-slate-900">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-900">Examples</a></li>
                <li><a href="#" className="hover:text-slate-900">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Company</h4>
              <ul className="mt-3 space-y-2 text-slate-600">
                <li><a href="#" className="hover:text-slate-900">About</a></li>
                <li><a href="#" className="hover:text-slate-900">Careers</a></li>
                <li><a href="#" className="hover:text-slate-900">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200 text-slate-600 text-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} Catloog. All rights reserved. Development by <a href="https://linkedin.com/in/mugahed-motaz" target="_blank" rel="noopener noreferrer">Mugahedmotaz</a></span>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-900">Terms</a>
              <a href="#" className="hover:text-slate-900">Privacy</a>
            </div>
            <span>Powerd by <a href="https://catloog.verecl.app" target='blank'>Catloog</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
