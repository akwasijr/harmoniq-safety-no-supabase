"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, type FormEvent } from "react";
import { LanguageSelector } from "@/components/ui/language-selector";
import {
  Shield,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Package,
  Globe,
  AlertTriangle,
  Smartphone,
  Cloud,
  Bell,
  Users,
  Wrench,
  FileText,
  Factory,
  Pickaxe,
  Truck,
  CheckCircle2,
  Mail,
  HardHat,
  Droplets,
  Stethoscope,
  Warehouse,
  UtensilsCrossed,
  BatteryCharging,
  GraduationCap,
  Plane,
} from "lucide-react";
import { motion, useScroll, useTransform, useInView, animate } from "framer-motion";
import { useTranslation } from "@/i18n";
import { getMarketingTranslations, type MarketingLocale } from "@/i18n/marketing";

const EASE_OUT_CUBIC: [number, number, number, number] = [0.4, 0, 0.2, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_CUBIC } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT_CUBIC } },
};

const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE_OUT_CUBIC } },
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -120 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE_OUT_CUBIC } },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 120 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE_OUT_CUBIC, delay: 0.1 } },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE_OUT_CUBIC } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerDramatic = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useParallaxOffset(ref: React.RefObject<HTMLElement | null>, range: number = 40) {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return useTransform(scrollYProgress, [0, 1], [range, -range]);
}

function FeaturesDropdown() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        className={`text-sm transition-colors ${open ? "text-white" : "text-zinc-400 hover:text-white"}`}
      >
        Features
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
          <div className="w-[480px] rounded-2xl bg-zinc-900/95 backdrop-blur-xl p-5 shadow-2xl">
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {[
                { title: "Incident Management", desc: "Report & Resolve", href: "#feature-details" },
                { title: "Asset Tracking", desc: "Lifecycle Management", href: "#feature-details" },
                { title: "Risk Assessments", desc: "JHA, JSA, RI&E", href: "#feature-details" },
                { title: "Analytics", desc: "Dashboards & Insights", href: "#feature-details" },
                { title: "Mobile App", desc: "Offline-First Field App", href: "#mobile" },
                { title: "Industries", desc: "Tailored for Your Sector", href: "#industries" },
              ].map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group block"
                >
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.title}
                  </p>
                  <p className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {item.desc}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const { locale } = useTranslation();
  const t = getMarketingTranslations(locale as MarketingLocale);

  const featureCardKeys = ["incident", "asset", "risk", "analytics"];
  const translatedFaqs = [
    { q: t("faq_section.q1"), a: t("faq_section.a1") },
    { q: t("faq_section.q2"), a: t("faq_section.a2") },
    { q: t("faq_section.q3"), a: t("faq_section.a3") },
    { q: t("faq_section.q4"), a: t("faq_section.a4") },
  ];

  const ipadRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ipadRef,
    offset: ["start 0.8", "end 0.5"],
  });
  const ipadRotate = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const ipadY = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const ipadScale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  const heroRef = useRef<HTMLDivElement>(null);

  // Section refs for scroll-based parallax
  const trustRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const testimonialRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const industryRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);

  const trustY = useParallaxOffset(trustRef, 30);
  const featuresY = useParallaxOffset(featuresRef, 35);
  const testimonialY = useParallaxOffset(testimonialRef, 25);
  const servicesY = useParallaxOffset(servicesRef, 30);
  const statsY = useParallaxOffset(statsRef, 30);
  const industryY = useParallaxOffset(industryRef, 28);
  const faqY = useParallaxOffset(faqRef, 20);

  const [scrolled, setScrolled] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white overflow-x-hidden">
      {/* Video background, desktop only */}
      <div className="absolute top-0 left-0 right-0 h-screen z-0 pointer-events-none overflow-hidden hidden md:block">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/bg-loop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Lightweight mobile background */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-black md:hidden" />



      {/* ── Header ── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            maxWidth: scrolled ? "56rem" : "64rem",
          }}
          style={{ width: scrolled ? "82vw" : "92vw", willChange: "transform, opacity" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex h-14 items-center justify-between rounded-full bg-zinc-900/70 backdrop-blur-2xl px-6 mx-auto"
        >
          <Link href="/" className="flex items-center">
            <Image src="/logo-white.svg" alt="Harmoniq" width={130} height={30} className="h-6 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <FeaturesDropdown />
            <a href="#industries" className="text-sm text-zinc-400 hover:text-white transition-colors">{t("nav.industries")}</a>
            <a href="#faq" className="text-sm text-zinc-400 hover:text-white transition-colors">{t("nav.faq")}</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors">
              {t("nav.get_started")}
            </Link>
          </div>
        </motion.div>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-end z-10">
        <div className="container mx-auto px-4 lg:px-8 relative z-10 pb-20 lg:pb-28">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-5xl ml-auto text-right"
          >
            <motion.h1 variants={fadeUp} className="font-[family-name:var(--font-playfair)] text-4xl sm:text-6xl lg:text-[6.5rem] font-normal tracking-tight leading-[1.0] text-white">
              Safety and asset{"\n"}management, reimagined
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-8 text-lg lg:text-xl text-zinc-400 max-w-2xl ml-auto leading-relaxed">
              {t("hero.description")}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
              <a href="#waitlist" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-black hover:bg-zinc-200 transition-colors">
                {t("hero.cta_start")}
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-700 px-8 py-3.5 text-base font-medium text-white hover:bg-zinc-600 transition-colors">
                {t("hero.cta_demo")}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Scroll-Animated iPad ── */}
      <section ref={ipadRef} className="relative z-10 -mt-12 pb-16 lg:pb-24">
        <div className="mx-auto px-4 lg:px-8" style={{ perspective: "1200px" }}>
          <motion.div
            style={{
              rotateX: ipadRotate,
              y: ipadY,
              scale: ipadScale,
              transformOrigin: "center bottom",
            }}
            className="relative mx-auto max-w-[90rem]"
          >
            {/* iPad frame */}
            <div className="relative rounded-[24px] bg-zinc-900 p-3 shadow-2xl shadow-black/20">
              <div className="rounded-[18px] bg-zinc-950 overflow-hidden aspect-[16/9]">
                <Image
                  src="/screen-01.png"
                  alt="Harmoniq Safety Dashboard"
                  width={1600}
                  height={1000}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust / Community Statement ── */}
      <motion.section
        ref={trustRef}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
        variants={fadeUp}
        style={prefersReducedMotion ? undefined : { y: trustY }}
        className="py-24 lg:py-32 relative z-10"
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-2xl sm:text-3xl lg:text-5xl font-light leading-snug text-zinc-300">
              {t("trust.statement")}
            </p>
          </div>
        </div>

        {/* Scrolling feature pills */}
        <div className="mt-16 overflow-hidden">
          <ScrollingPills
            items={pillsRow1}
            direction="left"
          />
          <ScrollingPills
            items={pillsRow2}
            direction="right"
            className="mt-3"
          />
        </div>
      </motion.section>

      {/* ── Features: Floating Pills Layout ── */}
      <section id="features" ref={featuresRef} className="py-24 lg:py-40 relative z-10 overflow-hidden">
        <motion.div style={prefersReducedMotion ? undefined : { y: featuresY }} className="container mx-auto px-4 lg:px-8">
          <div className="relative max-w-6xl mx-auto min-h-0 lg:min-h-[700px] flex items-center justify-center">

            {/* Floating feature pills, parallax fly-in from off-screen */}
            {features.map((feature, i) => {
              const isLeft = i % 2 === 0;
              const isTop = i < 4;
              return (
                <motion.div
                  key={feature.title}
                  initial={{
                    opacity: 0,
                    x: isLeft ? -80 : 80,
                    y: isTop ? -30 : 30,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                  }}
                  viewport={{ once: false, margin: "-50px" }}
                  transition={{ duration: 0.9, delay: i * 0.12, ease: EASE_OUT_CUBIC }}
                  className={`absolute hidden lg:flex items-center gap-3 rounded-full bg-zinc-800/60 backdrop-blur-sm px-5 py-3 ${featurePositions[i]}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${i % 2 === 0 ? "bg-zinc-700" : "bg-zinc-800"}`}>
                    <feature.icon className="h-4 w-4 text-zinc-300" />
                  </div>
                  <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">{feature.title}</span>
                </motion.div>
              );
            })}

            {/* Center content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-100px" }}
              variants={stagger}
              className="relative z-10 text-center max-w-2xl mx-auto"
            >
              <motion.h2
                variants={fadeUp}
                className="text-3xl sm:text-4xl lg:text-6xl font-normal leading-tight text-white"
              >
                {t("features.heading")}
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-6 text-base lg:text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
                {t("features.subheading")}
              </motion.p>
            </motion.div>

            {/* Mobile: show pills in a grid below */}
            <div className="mt-8 lg:hidden">
              <div className="flex flex-wrap justify-center gap-2">
                {features.slice(0, 6).map((feature) => (
                  <div key={feature.title} className="flex items-center gap-2 rounded-full bg-zinc-800/60 px-4 py-2">
                    <feature.icon className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs text-zinc-300">{feature.title}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </section>
      {/* ── Testimonial + Screenshot Section ── */}
      <section ref={testimonialRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: testimonialY }} className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            variants={stagger}
            className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch"
          >
            {/* Left: Grey image + testimonial */}
            <motion.div variants={slideLeft} className="flex flex-col gap-6">
              <div className="flex-1 rounded-3xl rounded-tl-none bg-zinc-800/50 overflow-hidden relative min-h-[200px] sm:min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/30 to-zinc-900/50" />
                <div className="relative z-10 flex items-end h-full p-8 lg:p-10">
                  <blockquote className="text-lg sm:text-2xl lg:text-3xl font-medium text-white leading-snug">
                    &ldquo;Harmoniq transformed our workplace safety. Incident reporting went from days to minutes.&rdquo;
                  </blockquote>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center text-lg font-bold text-white">S</div>
                <div>
                  <p className="font-semibold text-white">Sarah van der Berg</p>
                  <p className="text-sm text-zinc-500">Head of Safety, NordBuild Construction</p>
                </div>
              </div>
            </motion.div>

            {/* Right: App screenshot */}
            <motion.div variants={slideRight} className="rounded-3xl overflow-hidden bg-zinc-900/40 min-h-[250px] sm:min-h-[400px]">
              <Image
                src="/screen-02.png"
                alt="Harmoniq App Screenshot"
                width={800}
                height={600}
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Feature Details (Polar.sh style) ── */}
      <section id="feature-details" className="py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
          <div className="space-y-24 lg:space-y-32">
            {featureDetails.map((feature, index) => {
              const isReversed = index % 2 !== 0;
              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false, margin: "-100px" }}
                  variants={fadeUp}
                  className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${isReversed ? "lg:[direction:rtl]" : ""}`}
                >
                  {/* Visual side */}
                  <div className={isReversed ? "lg:[direction:ltr]" : ""}>
                    <div className="relative rounded-2xl overflow-hidden bg-zinc-900/40 aspect-[4/3]">
                      <feature.Visual />
                    </div>
                  </div>

                  {/* Text side */}
                  <div className={isReversed ? "lg:[direction:ltr]" : ""}>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-white leading-tight mb-4">
                      {t(`feature_cards.${featureCardKeys[index]}_title`)}
                    </h3>
                    <p className="text-base text-zinc-400 leading-relaxed mb-8">
                      {t(`feature_cards.${featureCardKeys[index]}_desc`)}
                    </p>
                    <div className="space-y-3">
                      {feature.checks.map((check) => (
                        <div
                          key={check}
                          className="flex items-center gap-3"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 shrink-0" />
                          <span className="text-sm text-zinc-300">{check}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Mobile App Showcase ── */}
      <section id="mobile" ref={servicesRef} className="py-24 lg:py-32 relative z-10 overflow-hidden">
        <motion.div style={prefersReducedMotion ? undefined : { y: servicesY }} className="container mx-auto px-4 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto"
          >
            <motion.div variants={slideLeft}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
                {t("mobile.heading")}
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                {t("mobile.description")}
              </p>
              <div className="space-y-4">
                {[
                  { icon: Smartphone, text: t("mobile.feature_report") },
                  { icon: ClipboardCheck, text: t("mobile.feature_checklists") },
                  { icon: Bell, text: t("mobile.feature_notifications") },
                  { icon: Cloud, text: t("mobile.feature_offline") },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
                      <item.icon className="h-4 w-4 text-zinc-300" />
                    </div>
                    <span className="text-zinc-300 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            {/* Two phone frames — slide from opposite sides */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              className="flex justify-center gap-4"
            >
              {[0, 1].map(i => (
                <motion.div
                  key={i}
                  variants={i === 0 ? slideFromLeft : slideFromRight}
                  className={`w-[140px] sm:w-[180px] h-[280px] sm:h-[360px] rounded-[28px] bg-zinc-900 p-2 shadow-xl ${i === 1 ? "mt-8 sm:mt-12" : ""}`}
                >
                  <div className="w-full h-full rounded-[22px] bg-zinc-950 overflow-hidden flex flex-col">
                    {/* Status bar */}
                    <div className="h-6 px-3 flex items-center justify-between">
                      <span className="text-[8px] text-zinc-500">9:41</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-1.5 rounded-sm bg-zinc-700" />
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                      </div>
                    </div>
                    <div className="flex-1 p-3 space-y-2.5">
                      {i === 0 ? (<>
                        {/* Phone 1: Incident list */}
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-3 w-3 text-zinc-400" />
                          <span className="text-[10px] font-semibold text-zinc-200">Incidents</span>
                        </div>
                        {[
                          { label: "Gas leak detected", status: "bg-red-500" },
                          { label: "Safety rail damaged", status: "bg-yellow-500" },
                          { label: "PPE check overdue", status: "bg-blue-500" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-2.5 py-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${item.status}`} />
                            <span className="text-[9px] text-zinc-300">{item.label}</span>
                          </div>
                        ))}
                        <div className="rounded-lg bg-zinc-800/60 p-2.5 mt-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] text-zinc-400">This week</span>
                            <span className="text-[10px] font-bold text-white">12</span>
                          </div>
                          <div className="flex gap-0.5 items-end h-8">
                            {[40, 65, 30, 80, 55, 45, 70].map((h, j) => (
                              <div key={j} className="flex-1 rounded-sm bg-zinc-600/60" style={{ height: `${h}%` }} />
                            ))}
                          </div>
                        </div>
                      </>) : (<>
                        {/* Phone 2: Asset inspection */}
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-3 w-3 text-zinc-400" />
                          <span className="text-[10px] font-semibold text-zinc-200">Assets</span>
                        </div>
                        <div className="rounded-lg bg-zinc-800/60 p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded bg-zinc-800 flex items-center justify-center">
                              <Wrench className="h-3 w-3 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[9px] font-medium text-zinc-200">Crane #04</p>
                              <p className="text-[8px] text-zinc-500">Last inspected 3d ago</p>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-700">
                            <div className="h-1 rounded-full bg-green-500 w-[78%]" />
                          </div>
                        </div>
                        <div className="rounded-lg bg-zinc-800/60 p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded bg-zinc-800 flex items-center justify-center">
                              <Shield className="h-3 w-3 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-[9px] font-medium text-zinc-200">Fire Ext. B2</p>
                              <p className="text-[8px] text-zinc-500">Due in 5 days</p>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-700">
                            <div className="h-1 rounded-full bg-yellow-500 w-[45%]" />
                          </div>
                        </div>
                        <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-400">Compliance</span>
                          <span className="text-[10px] font-bold text-emerald-400">94%</span>
                        </div>
                      </>)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats 3-Column ── */}
      <section id="stats" ref={statsRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: statsY }} className="container mx-auto px-4 lg:px-8">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold text-center mb-16"
          >
            {t("success.heading")}
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            variants={staggerDramatic}
            className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            <motion.div variants={scaleUp} className="rounded-3xl bg-zinc-900/40 p-8">
              <h3 className="text-xl font-bold mb-3">{t("success.ai_title")}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                {t("success.ai_desc")}
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors">
                {t("success.explore")}
              </Link>
            </motion.div>
            <motion.div variants={scaleUp} className="rounded-3xl bg-zinc-900/40 p-8">
              <h3 className="text-xl font-bold mb-6">{t("success.key_stats")}</h3>
              <div className="space-y-5">
                {[
                  { label: t("stats.incidents_reported"), pct: 92 },
                  { label: t("stats.cost_reduction"), pct: 40 },
                  { label: t("stats.compliance_rate"), pct: 98 },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">{stat.label}</span>
                      <AnimatedCounter value={stat.pct} suffix="%" className="text-white font-medium text-sm" />
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        className="h-2 rounded-full bg-white origin-left"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: stat.pct / 100 }}
                        viewport={{ once: false }}
                        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" as const }}
                        style={{ willChange: "transform" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Industry Showcase ── */}
      <section id="industries" ref={industryRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: industryY }} className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            variants={stagger}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={fadeUp} className="mb-16">
              <h2
                className="text-3xl sm:text-4xl lg:text-6xl font-normal leading-tight text-white mb-4"
              >
                {t("industries.heading")}
              </h2>
              <p className="text-zinc-400 text-lg">
                {t("industries.subheading")}
              </p>
            </motion.div>

            {(() => {
              const industries = [
                {
                  icon: HardHat,
                  name: t("industries.construction"),
                  description: "Every shift begins with a Job Hazard Analysis right on your crew's phones. Fall protection audits, scaffold inspections, toolbox talks: all tracked automatically. When your superintendent walks a new job site, the pre-task checklist is already loaded based on the scope of work. Photos of hazards get GPS-tagged and timestamped. If OSHA visits, your documentation is audit-ready before they finish parking.",
                  features: ["Job Hazard Analysis (JHA)", "Fall protection audits", "Scaffold inspection checklists", "Toolbox talk tracking", "Photo-documented hazard reporting", "OSHA compliance reports"],
                },
                {
                  icon: Factory,
                  name: t("industries.manufacturing"),
                  description: "Lockout/tagout compliance becomes part of the machine changeover process, not a separate safety exercise. Ergonomic assessments for repetitive tasks, machine guarding inspections on every press and conveyor, near-miss reporting from the production floor: everything flows into one dashboard. Floor managers track completion rates in real time without leaving the line. When a line goes down for maintenance, the safety protocol follows automatically.",
                  features: ["Lockout/tagout compliance", "Machine guarding inspections", "Ergonomic assessments", "Near-miss reporting", "Production floor dashboards", "Maintenance safety protocols"],
                },
                {
                  icon: Droplets,
                  name: t("industries.oil_gas"),
                  description: "Permit-to-work management, confined space entry, H2S monitoring: digitized for remote well sites where connectivity is unreliable. Your crew completes inspections offline and everything syncs when signal returns. Hot work permits route through the approval chain on mobile. Contractor orientation checklists ensure every person on your lease is trained and documented before they touch a valve.",
                  features: ["Permit-to-work management", "Confined space entry logs", "Offline inspection sync", "Hot work permit approvals", "Contractor orientation checklists", "H2S monitoring records"],
                },
                {
                  icon: Stethoscope,
                  name: t("industries.healthcare"),
                  description: "Infection control rounds, sharps disposal tracking, patient safety audits: all designed for the pace of clinical work. Nurses complete hand hygiene observations between patient rooms in seconds. OSHA bloodborne pathogen compliance is built into the daily workflow, not a quarterly scramble. Incident reports for needle sticks or patient falls trigger the right notifications to risk management immediately.",
                  features: ["Infection control rounds", "Sharps disposal tracking", "Patient safety audits", "Hand hygiene observations", "Bloodborne pathogen compliance", "Incident auto-notifications"],
                },
                {
                  icon: Warehouse,
                  name: t("industries.warehousing"),
                  description: "Forklift operators scan a QR code to start their pre-shift inspection. Dock safety checks, fire extinguisher rounds, rack integrity audits: all scheduled, all tracked, all completed on mobile. Warehouse managers see which zones have open items before the morning standup. When a rack shows damage, the escalation path from photo to work order to repair confirmation is fully digital.",
                  features: ["QR code asset scanning", "Forklift pre-shift inspections", "Fire extinguisher rounds", "Rack integrity audits", "Zone-based compliance tracking", "Photo-to-work-order escalation"],
                },
                {
                  icon: Pickaxe,
                  name: t("industries.mining"),
                  description: "Ground control monitoring, ventilation system checks, blast area safety protocols: built for both underground and surface operations. Each shift starts with a strata assessment on the crew leader's device. PPE compliance is tracked per worker, per shift, per zone. When conditions change mid-shift, updated risk assessments push to every device in the section. Your safety record stays clean because the system catches gaps before regulators do.",
                  features: ["Ground control monitoring", "Ventilation system checks", "Blast area safety protocols", "PPE compliance per worker", "Live risk assessment updates", "Shift-based strata assessments"],
                },
                {
                  icon: UtensilsCrossed,
                  name: t("industries.food_beverage"),
                  description: "HACCP inspections, allergen management, cold chain monitoring with automated escalation. A missed temperature check triggers an alert to the shift supervisor within minutes, not hours. Sanitation audits follow your cleaning schedules automatically. When an allergen protocol changes, every relevant checklist updates across all your facilities. Auditors see a complete digital trail from receiving dock to shipping bay.",
                  features: ["HACCP inspections", "Allergen management", "Cold chain temperature monitoring", "Automated sanitation schedules", "Cross-facility checklist sync", "Full audit trail export"],
                },
                {
                  icon: BatteryCharging,
                  name: t("industries.utilities"),
                  description: "Arc flash compliance, substation inspections, vegetation management workflows for field crews managing critical infrastructure across dispersed service territories. Line clearance audits follow your reliability standards. When a crew arrives at a transformer, the inspection form loads based on equipment class and last service date. Switching procedures and safety protocols travel with the work order, not in a binder back at the office.",
                  features: ["Arc flash compliance", "Substation inspections", "Vegetation management workflows", "Equipment-based form loading", "Line clearance audits", "Mobile switching procedures"],
                },
                {
                  icon: Truck,
                  name: t("industries.transportation"),
                  description: "Pre-trip vehicle inspections that DOT auditors actually accept. Drivers complete the walk-around on their phone: tires, brakes, lights, cargo securement. Defects route to maintenance automatically. Dispatchers see fleet compliance at a glance before releasing loads. Driver safety scoring aggregates inspection data, incident history, and training records into one profile. CSA scores improve because the documentation is always current.",
                  features: ["Pre-trip vehicle inspections", "DOT-compliant documentation", "Automatic defect routing", "Fleet compliance dashboard", "Driver safety scoring", "Cargo securement checklists"],
                },
                {
                  icon: GraduationCap,
                  name: t("industries.education"),
                  description: "Playground safety checks before the first bell. Chemistry lab inspections before every class period. Emergency drill tracking with timestamps and headcount verification. Visitor management logs who entered, when, and which areas they accessed. Facilities teams manage building safety, grounds maintenance, and fire code compliance from a single dashboard instead of scattered spreadsheets across departments.",
                  features: ["Playground safety checks", "Lab safety inspections", "Emergency drill tracking", "Visitor management logs", "Fire code compliance", "Facilities maintenance dashboard"],
                },
                {
                  icon: Plane,
                  name: t("industries.airports"),
                  description: "Terminal operations and airside logistics each carry their own safety demands. Passenger-facing areas need escalator inspections, wet floor tracking, AED station checks, and emergency evacuation drill documentation. Behind the scenes, baggage handling systems require conveyor safety audits, ground support equipment pre-use inspections, and ramp area FOD walks. Fueling operations follow strict fire safety protocols. With hundreds of contractors operating in shared spaces, Harmoniq tracks who completed what training, which zones are cleared, and whether every vehicle on the apron passed its daily check, all from a single dashboard that security, operations, and ground handling teams can access by role.",
                  features: ["GSE pre-use inspections", "Ramp FOD walk checklists", "Terminal safety audits", "Baggage system conveyor checks", "Fueling fire safety protocols", "Multi-contractor compliance tracking"],
                },
              ];
              const current = industries[selectedIndustry];
              return (
                <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-12">
                  {/* Mobile: dropdown select */}
                  <div className="lg:hidden">
                    <select
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(Number(e.target.value))}
                      className="w-full rounded-lg bg-zinc-900/80 px-4 py-3 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23a1a1aa' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                    >
                      {industries.map((industry, i) => (
                        <option key={industry.name} value={i}>
                          {industry.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Desktop: vertical tab list */}
                  <div className="hidden lg:flex lg:flex-col gap-1">
                    {industries.map((industry, i) => {
                      const Icon = industry.icon;
                      const isActive = selectedIndustry === i;
                      return (
                        <button
                          key={industry.name}
                          onClick={() => setSelectedIndustry(i)}
                          className={`flex items-center gap-3 py-3 px-2 text-left transition-colors duration-150 ${
                            isActive
                              ? "text-white"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                            {industry.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-6 lg:pt-3">
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {current.name}
                    </h3>
                    <p className="text-zinc-400 leading-relaxed mb-6">
                      {current.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      {current.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                          <div className="h-1 w-1 rounded-full bg-zinc-500 shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        </motion.div>
      </section>


      {/* ── FAQ ── */}
      <section id="faq" ref={faqRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: faqY }} className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false }}
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
          >
            {t("faq_section.heading")}
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            variants={stagger}
            className="space-y-4"
          >
            {translatedFaqs.map(faq => (
              <motion.div key={faq.q} variants={fadeUp} className="rounded-2xl bg-zinc-900/40 p-6">
                <h3 className="text-base font-semibold text-zinc-200">{faq.q}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
      {/* ── Waitlist CTA ── */}
      <WaitlistSection />

      {/* ── Footer ── */}
      <footer className="py-16 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Image src="/logo-white.svg" alt="Harmoniq" width={130} height={30} className="h-6 w-auto" />
              <p className="mt-4 text-sm text-zinc-500 leading-relaxed max-w-xs">
                Making workplaces safer and operations smarter through technology, real-time analytics, and regulatory compliance.
              </p>
              <div className="flex gap-4 mt-6">
                {["X", "in", "f"].map(social => (
                  <button key={social} type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/50 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                    {social}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">{t("footer_links.product")}</h4>
              <ul className="space-y-3">
                {[t("footer_links.features"), t("footer_links.integrations"), t("footer_links.mobile_app"), t("footer_links.changelog")].map(item => (
                  <li key={item}><button type="button" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">{t("footer_links.company")}</h4>
              <ul className="space-y-3">
                {[t("footer_links.about"), t("footer_links.blog"), t("footer_links.careers"), t("footer.contact")].map(item => (
                  <li key={item}><button type="button" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-zinc-500 hover:text-white transition-colors">{t("footer.privacy")}</Link></li>
                <li><Link href="/terms" className="text-sm text-zinc-500 hover:text-white transition-colors">{t("footer.terms")}</Link></li>
                <li><Link href="/cookies" className="text-sm text-zinc-500 hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link href="/gdpr" className="text-sm text-zinc-500 hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-600">{t("footer.copyright", { year: String(new Date().getFullYear()) })}</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-zinc-600 hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-zinc-600 hover:text-white transition-colors">Disclaimer</Link>
              <Link href="/cookies" className="text-sm text-zinc-600 hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Fixed language selector — bottom-left */}
      <div className="fixed bottom-6 left-6 z-50">
        <LanguageSelector variant="pill" />
      </div>
    </div>
  );
}

// Positions for floating pills scattered around the center (matching reference design)
const featurePositions = [
  "top-4 left-[15%]",           // top-left area
  "top-4 right-[15%]",          // top-right area
  "top-[22%] left-[2%]",        // mid-left high
  "top-[22%] right-[2%]",       // mid-right high
  "top-[50%] -translate-y-1/2 left-[0%]",  // center-left
  "top-[50%] -translate-y-1/2 right-[0%]", // center-right
  "bottom-[22%] left-[5%]",     // lower-left
  "bottom-[22%] right-[5%]",    // lower-right
  "bottom-4 left-[25%]",        // bottom-center-left
];

const features = [
  { icon: AlertTriangle, title: "Incident Reporting" },
  { icon: ClipboardCheck, title: "Inspections & Checklists" },
  { icon: Shield, title: "Risk Assessments" },
  { icon: Package, title: "Asset Lifecycle Management" },
  { icon: BarChart3, title: "Real-Time Analytics" },
  { icon: Globe, title: "Multi-Language Support" },
  { icon: Wrench, title: "Work Order Management" },
  { icon: FileText, title: "Compliance Documents" },
  { icon: Users, title: "Team Management" },
];

// ── Animated Feature Visuals (Polar.sh-inspired) ──

const INCIDENTS_DATA = [
  { severity: "CRITICAL", label: "Gas leak detected — Zone B", time: "2m ago", color: "bg-red-500/90" },
  { severity: "HIGH", label: "Safety rail damaged — Floor 3", time: "8m ago", color: "bg-amber-500/90" },
  { severity: "MEDIUM", label: "PPE violation — Loading dock", time: "15m ago", color: "bg-yellow-600/90" },
  { severity: "LOW", label: "Signage missing — Entrance A", time: "23m ago", color: "bg-blue-500/90" },
  { severity: "CRITICAL", label: "Chemical spill — Lab 2", time: "31m ago", color: "bg-red-500/90" },
  { severity: "HIGH", label: "Fire exit blocked — Wing C", time: "45m ago", color: "bg-amber-500/90" },
];

function LiveIncidentsFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isInView) { setVisibleCount(0); return; }
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= INCIDENTS_DATA.length) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div ref={ref} className="flex items-center justify-center h-full p-5 lg:p-6">
      <div className="rounded-xl bg-zinc-950/80 p-4 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-200">Live Incidents</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">24 reported</span>
        </div>
        <div className="space-y-0.5">
          {INCIDENTS_DATA.slice(0, visibleCount).map((incident, i) => (
            <motion.div
              key={`${incident.severity}-${i}`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT_CUBIC }}
              className="flex items-center gap-2.5 py-2 border-b border-zinc-800/30 last:border-0"
            >
              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${incident.color} text-white shrink-0`}>
                {incident.severity}
              </span>
              <span className="text-[10px] text-zinc-400 flex-1 truncate">{incident.label}</span>
              <span className="text-[9px] text-zinc-600 shrink-0 font-mono">{incident.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const ASSETS_DATA = [
  { name: "Crane #04", location: "Dock B", health: 92, status: "Operational", statusColor: "text-emerald-400" },
  { name: "Fire Ext. B2", location: "Floor 2", health: 45, status: "Due Soon", statusColor: "text-amber-400" },
  { name: "Forklift #12", location: "Warehouse", health: 78, status: "Operational", statusColor: "text-emerald-400" },
];

function AssetScanVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const [activeAsset, setActiveAsset] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveAsset(prev => (prev + 1) % ASSETS_DATA.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isInView]);

  const displayedAssetIndex = isInView ? activeAsset : 0;
  const asset = ASSETS_DATA[displayedAssetIndex];

  return (
    <div ref={ref} className="flex items-center justify-center h-full p-5 lg:p-6">
      <div className="w-full space-y-3">
        {/* QR Scan indicator */}
        <motion.div
          key={activeAsset}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT_CUBIC }}
          className="rounded-xl bg-zinc-950/80 p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-zinc-500 rounded-sm relative">
                <div className="absolute inset-1 grid grid-cols-2 gap-0.5">
                  <div className="bg-zinc-500 rounded-[1px]" />
                  <div className="bg-zinc-500 rounded-[1px]" />
                  <div className="bg-zinc-500 rounded-[1px]" />
                  <div className="bg-transparent" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{asset.name}</p>
              <p className="text-[10px] text-zinc-500">{asset.location}</p>
            </div>
            <span className={`ml-auto text-[10px] font-medium ${asset.statusColor}`}>{asset.status}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-500">Health Score</span>
              <span className="text-white font-mono">{asset.health}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${asset.health > 70 ? "bg-emerald-500" : "bg-amber-500"}`}
                initial={{ width: 0 }}
                animate={{ width: `${asset.health}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
        {/* Asset list */}
        <div className="flex gap-1.5">
           {ASSETS_DATA.map((a, i) => (
             <button
               key={a.name}
               onClick={() => setActiveAsset(i)}
               className={`flex-1 rounded-lg py-2 px-2 text-center transition-colors ${
                 i === displayedAssetIndex ? "bg-zinc-800 text-white" : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
               }`}
             >
              <span className="text-[9px] font-medium block truncate">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const RISK_TABS = [
  { label: "JHA", full: "Job Hazard Analysis", desc: "Identify hazards before each task begins" },
  { label: "JSA", full: "Job Safety Analysis", desc: "Break down job steps and associated risks" },
  { label: "RI&E", full: "Risk Inventory & Evaluation", desc: "Dutch regulatory compliance assessments" },
  { label: "ARBOWET", full: "Working Conditions Act", desc: "Netherlands occupational safety framework" },
];

function RiskAssessmentTabs() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % RISK_TABS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isInView]);
  const displayedTabIndex = isInView ? activeTab : 0;

  return (
    <div ref={ref} className="flex items-center justify-center h-full p-5 lg:p-6">
      <div className="w-full">
        <div className="grid grid-cols-2 gap-2.5">
           {RISK_TABS.map((tab, i) => (
             <motion.button
               key={tab.label}
               onClick={() => setActiveTab(i)}
               animate={{
                 borderColor: i === displayedTabIndex ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
                 backgroundColor: i === displayedTabIndex ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.3)",
               }}
               transition={{ duration: 0.3 }}
               className="rounded-xl border p-3.5 text-left transition-colors"
             >
               <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 transition-colors ${
                 i === displayedTabIndex ? "text-white" : "text-zinc-500"
               }`}>
                 {tab.label}
               </span>
               <span className={`text-[10px] leading-snug block transition-colors ${
                 i === displayedTabIndex ? "text-zinc-300" : "text-zinc-600"
               }`}>
                 {tab.desc}
               </span>
            </motion.button>
          ))}
        </div>
        {/* Active detail */}
        <motion.div
           key={displayedTabIndex}
           initial={{ opacity: 0, y: 8 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3, ease: EASE_OUT_CUBIC }}
           className="mt-3 rounded-xl bg-zinc-950/80 p-3.5"
         >
           <div className="flex items-center justify-between">
             <span className="text-xs font-medium text-white">{RISK_TABS[displayedTabIndex].full}</span>
             <span className="text-[10px] text-emerald-400 font-mono">Active</span>
           </div>
           <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4].map(step => (
                <div key={step} className="flex-1">
                 <div className={`h-1 rounded-full ${step <= displayedTabIndex + 1 ? "bg-white" : "bg-zinc-800"}`} />
                 <span className="text-[8px] text-zinc-600 mt-1 block">Step {step}</span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const CHART_BARS = [32, 48, 28, 62, 45, 75, 58, 82, 68, 90, 78, 95];

function AnalyticsDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const animated = isInView;

  return (
    <div ref={ref} className="flex items-center justify-center h-full p-5 lg:p-6">
      <div className="w-full space-y-3">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Incidents", value: 12, suffix: "" },
            { label: "Compliance", value: 98, suffix: "%" },
            { label: "Avg. Response", value: 14, suffix: "m" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={animated ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: EASE_OUT_CUBIC }}
              className="rounded-lg bg-zinc-950/80 p-3 text-center"
            >
              <span className="text-lg font-semibold text-white block">{animated ? kpi.value : 0}{kpi.suffix}</span>
              <span className="text-[9px] text-zinc-500">{kpi.label}</span>
            </motion.div>
          ))}
        </div>
        {/* Chart */}
        <div className="rounded-xl bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-zinc-300">Incident Trends</span>
            <span className="text-[9px] text-zinc-600 font-mono">12 months</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {CHART_BARS.map((h, j) => (
              <motion.div
                key={j}
                className="flex-1 rounded-sm bg-white/80 origin-bottom"
                style={{ height: `${h}%`, willChange: "transform" }}
                initial={{ scaleY: 0 }}
                animate={animated ? { scaleY: 1 } : { scaleY: 0 }}
                transition={{ duration: 0.6, delay: j * 0.05, ease: "easeOut" }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
              <span key={i} className="text-[8px] text-zinc-700 flex-1 text-center">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const featureDetails: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  Visual: () => React.JSX.Element;
  checks: string[];
}[] = [
  {
    icon: AlertTriangle,
    title: "Real-time incident management",
    description: "Report, track, and resolve safety incidents from anywhere. GPS-tagged reports with photo evidence flow directly to your dashboard.",
    Visual: LiveIncidentsFeed,
    checks: [
      "GPS-tagged incident reports with photo evidence",
      "Automatic severity classification and routing",
      "Real-time notifications to safety managers",
      "Complete audit trail from report to resolution",
    ],
  },
  {
    icon: Package,
    title: "Complete asset lifecycle tracking",
    description: "Track every asset from acquisition to retirement. QR code scanning, automated inspection schedules, and maintenance history.",
    Visual: AssetScanVisual,
    checks: [
      "QR code scanning for instant asset lookup",
      "Automated inspection scheduling",
      "Maintenance history and work orders",
      "Condition tracking with photo documentation",
      "Custom fields per asset category",
    ],
  },
  {
    icon: Shield,
    title: "Compliance-ready risk assessments",
    description: "Built-in forms for JHA, JSA, RI&E, Arbowet, and more. Country-specific compliance workflows that adapt to your requirements.",
    Visual: RiskAssessmentTabs,
    checks: [
      "JHA, JSA, RI&E, Arbowet, SAM forms built-in",
      "Country-specific regulatory compliance",
      "Step-by-step guided assessments",
      "Automatic risk scoring and prioritization",
    ],
  },
  {
    icon: BarChart3,
    title: "Actionable safety analytics",
    description: "Monitor incident trends, compliance rates, and resolution times with dashboards that surface what matters most.",
    Visual: AnalyticsDashboard,
    checks: [
      "Real-time compliance dashboards",
      "Incident trend analysis and forecasting",
      "Resolution time tracking",
      "Exportable reports for audits",
    ],
  },
];

const faqs = [
  {
    q: "How can I get access?",
    a: "Harmoniq is currently in private testing with select companies. We\u2019re refining the platform with real feedback before opening up. Join our waitlist below and we\u2019ll notify you as soon as spots open.",
  },
  {
    q: "Which compliance standards do you support?",
    a: "Harmoniq supports OSHA (US), Arbowet/RI&E (Netherlands), AFS/SAM (Sweden), and ISO 45001 with country-specific forms and workflows.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. The mobile app works offline and automatically syncs when connectivity is restored, ensuring field workers can always report and inspect.",
  },
  {
    q: "What languages are supported?",
    a: "Currently available in English, Dutch, and Swedish, with locale-aware dates, numbers, and compliance forms for each region.",
  },
];

const pillsRow1 = [
  "Incident Reporting",
  "Asset Inspections",
  "Risk Assessments",
  "Real-Time Alerts",
  "QR Asset Tracking",
];

const pillsRow2 = [
  "Compliance Tracking",
  "Maintenance Scheduling",
  "Cloud Sync",
  "Work Orders",
  "Mobile App",
];

function WaitlistSection() {
  const { locale } = useTranslation();
  const t = getMarketingTranslations(locale as MarketingLocale);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Also store locally
        const existing = JSON.parse(localStorage.getItem("harmoniq_waitlist") || "[]");
        existing.push({ email: email.trim(), timestamp: new Date().toISOString() });
        localStorage.setItem("harmoniq_waitlist", JSON.stringify(existing));
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.message || "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <motion.section
      id="waitlist"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false }}
      variants={fadeUp}
      className="py-24 lg:py-32 relative z-10"
    >
      <div className="container mx-auto px-4 lg:px-8 relative text-center max-w-2xl">
        {status === "success" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT_CUBIC }}
            className="rounded-3xl bg-zinc-900/40 p-10"
          >
            <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-3">
              You&apos;re on the list!
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed">
              {message || "We\u2019ll reach out as soon as a spot opens up."}
            </p>
          </motion.div>
        ) : (
          <div className="rounded-3xl bg-zinc-900/40 p-10">
            <Mail className="h-10 w-10 text-zinc-400 mx-auto mb-4" />
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-3">
              {t("cta.heading")}
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              {t("cta.subheading")}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-full bg-zinc-800 px-5 py-3 text-base text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Joining\u2026" : t("hero.cta_start")}
                {status !== "loading" && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
            {status === "error" && (
              <p className="mt-3 text-sm text-red-400">{message}</p>
            )}
            <p className="mt-4 text-xs text-zinc-600">
              No spam, ever. We&apos;ll only email you about access.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function ScrollingPills({
  items,
  direction,
  className = "",
}: {
  items: string[];
  direction: "left" | "right";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    direction === "left" ? [40, -80] : [-80, 40]
  );

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-3 w-max mx-auto justify-center"
        style={{ x }}
      >
        {items.map((pill) => (
          <span
            key={pill}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-zinc-900/60 px-5 py-2.5 text-sm text-zinc-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            {pill}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function AnimatedCounter({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.floor(v)),
    });
    return () => controls.stop();
  }, [isInView, value]);

  return (
    <span ref={ref} className={className}>
      {isInView ? display : 0}{suffix}
    </span>
  );
}
