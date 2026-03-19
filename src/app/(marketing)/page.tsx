"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState, type FormEvent } from "react";
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
  Building2,
  Zap,
  Factory,
  Ship,
  Pickaxe,
  Cross,
  Fuel,
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
} from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const EASE_OUT_CUBIC: [number, number, number, number] = [0.4, 0, 0.2, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT_CUBIC } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE_OUT_CUBIC } },
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
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE_OUT_CUBIC } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerSlow = {
  visible: { transition: { staggerChildren: 0.18 } },
};

const staggerDramatic = {
  visible: { transition: { staggerChildren: 0.14 } },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
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

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
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
  const mobileRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLElement>(null);
  const industryRef = useRef<HTMLElement>(null);
  const benefitsRef = useRef<HTMLElement>(null);
  const faqRef = useRef<HTMLElement>(null);

  const trustY = useParallaxOffset(trustRef, 30);
  const featuresY = useParallaxOffset(featuresRef, 35);
  const testimonialY = useParallaxOffset(testimonialRef, 25);
  const servicesY = useParallaxOffset(servicesRef, 30);
  const mobileY = useParallaxOffset(mobileRef, 35);
  const statsY = useParallaxOffset(statsRef, 30);
  const industryY = useParallaxOffset(industryRef, 28);
  const benefitsY = useParallaxOffset(benefitsRef, 25);
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

      {/* Purple gradient for below-the-fold (desktop only) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] rounded-full blur-[160px] bg-[#8B5CF6] opacity-20" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] bg-[#6d28d9] opacity-15" />
      </div>

      {/* ── Stadium-Shaped Header ── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
        <motion.div
          initial={{ y: -20, opacity: 0, width: "92vw" }}
          animate={{
            y: 0,
            opacity: 1,
            width: scrolled ? "min(82vw, 56rem)" : "min(92vw, 64rem)",
          }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex h-14 items-center justify-between rounded-full bg-zinc-900/70 backdrop-blur-2xl px-6 mx-auto"
        >
          <Link href="/" className="flex items-center">
            <Image src="/logo-white.svg" alt="Harmoniq" width={130} height={30} className="h-6 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Product</a>
            <a href="#industries" className="text-sm text-zinc-400 hover:text-white transition-colors">Industries</a>
            <a href="#services" className="text-sm text-zinc-400 hover:text-white transition-colors">Solutions</a>
            <a href="#stats" className="text-sm text-zinc-400 hover:text-white transition-colors">Resources</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/signup" className="rounded-full bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
              Get Started
            </a>
          </div>
        </motion.div>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative pt-24 pb-0 lg:pt-32 lg:pb-0 z-10">
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.p variants={fadeUp} className="text-sm font-medium text-[#8B5CF6]/80 tracking-widest mb-4">
              Workplace Safety & Asset Management
            </motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-8xl font-normal tracking-tight leading-[1.02] text-white" style={{ fontFamily: "var(--font-playfair)" }}>
              Harmoniq
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg lg:text-xl text-white max-w-2xl mx-auto leading-relaxed">
              Report incidents, manage assets, run inspections, and ensure compliance, all in one powerful platform built for modern operations teams.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#waitlist" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8B5CF6] px-8 py-3.5 text-base font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
                Join the Waitlist
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/60 px-8 py-3.5 text-base font-medium text-white hover:bg-zinc-800 transition-colors">
                Contact Sales
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
            <div className="relative rounded-[24px] bg-zinc-900 p-3 shadow-2xl shadow-[#8B5CF6]/10">
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
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUp}
        style={prefersReducedMotion ? undefined : { y: trustY }}
        className="py-24 lg:py-32 relative z-10"
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light leading-snug text-zinc-300">
              Trusted by <span className="text-white font-semibold">operations teams</span> across industries worldwide.
              A growing community committed to <span className="text-white font-bold">protecting their people and assets</span> while
              staying compliant.
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
          <div className="relative max-w-6xl mx-auto min-h-[600px] lg:min-h-[700px] flex items-center justify-center">

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
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.9, delay: i * 0.12, ease: EASE_OUT_CUBIC }}
                  className={`absolute hidden lg:flex items-center gap-3 rounded-full bg-zinc-800/60 backdrop-blur-sm px-5 py-3 ${featurePositions[i]}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${i % 2 === 0 ? "bg-[#8B5CF6]" : "bg-[#8B5CF6]/20"}`}>
                    <feature.icon className={`h-4 w-4 ${i % 2 === 0 ? "text-white" : "text-[#8B5CF6]"}`} />
                  </div>
                  <span className="text-sm font-medium text-zinc-200 whitespace-nowrap">{feature.title}</span>
                </motion.div>
              );
            })}

            {/* Center content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
              className="relative z-10 text-center max-w-2xl mx-auto"
            >
              <motion.h2
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight text-white"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                More than a management tool
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-6 text-base lg:text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
                Our platform offers a range of tools designed to help you stay organized, manage safety & assets, and achieve your compliance goals.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#waitlist" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8B5CF6] px-8 py-3.5 text-base font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
                  Join the Waitlist
                </a>
                <a href="#services" className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/60 px-8 py-3.5 text-base font-medium text-white hover:bg-zinc-800 transition-colors">
                  Learn More
                </a>
              </motion.div>
            </motion.div>

            {/* Mobile: show pills in a grid below */}
            <div className="absolute bottom-0 left-0 right-0 lg:hidden">
              <div className="flex flex-wrap justify-center gap-2">
                {features.slice(0, 6).map((feature) => (
                  <div key={feature.title} className="flex items-center gap-2 rounded-full bg-zinc-800/60 px-4 py-2">
                    <feature.icon className="h-4 w-4 text-[#8B5CF6]" />
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
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch"
          >
            {/* Left: Grey image + testimonial */}
            <motion.div variants={slideLeft} className="flex flex-col gap-6">
              <div className="flex-1 rounded-3xl rounded-tl-none bg-zinc-800/50 overflow-hidden relative min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/30 to-zinc-900/50" />
                <div className="relative z-10 flex items-end h-full p-8 lg:p-10">
                  <blockquote className="text-2xl lg:text-3xl font-medium text-white leading-snug">
                    &ldquo;Harmoniq transformed our workplace safety. Incident reporting went from days to minutes.&rdquo;
                  </blockquote>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-[#8B5CF6]/40 flex items-center justify-center text-lg font-bold text-[#8B5CF6]">S</div>
                <div>
                  <p className="font-semibold text-white">Sarah van der Berg</p>
                  <p className="text-sm text-zinc-500">Head of Safety, NordBuild Construction</p>
                </div>
              </div>
            </motion.div>

            {/* Right: App screenshot */}
            <motion.div variants={slideRight} className="rounded-3xl overflow-hidden bg-zinc-900/40 min-h-[400px]">
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
      <section id="services" ref={servicesRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: servicesY }} className="container mx-auto px-4 lg:px-8">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold text-center mb-16"
          >
            All in One Place
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="max-w-5xl mx-auto rounded-3xl bg-zinc-900/40 p-8 lg:p-12"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Conversion", "Compliance", "Analytics"].map(tag => (
                    <span key={tag} className="rounded-full bg-zinc-800/60 px-3 py-1 text-xs text-zinc-400">{tag}</span>
                  ))}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4">Real-Time Safety & Asset Analytics</h3>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  Monitor incident trends, asset health, compliance rates, and resolution times with powerful dashboards that give you a complete view of your operations.
                </p>
                <Link href="/login" className="inline-flex items-center gap-2 text-[#8B5CF6] font-medium hover:underline">
                  Read More <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {/* Chart mockup */}
              <div className="rounded-2xl bg-zinc-950/60 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-zinc-300">Overall Performance</span>
                  <span className="text-xs text-zinc-500">Last 12 months</span>
                </div>
                <div className="relative h-48">
                  <svg viewBox="0 0 400 160" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,120 C40,100 80,110 120,80 C160,50 200,60 240,40 C280,20 320,35 360,15 L400,10 L400,160 L0,160 Z" fill="url(#chartGrad)" />
                    <path d="M0,120 C40,100 80,110 120,80 C160,50 200,60 240,40 C280,20 320,35 360,15 L400,10" fill="none" stroke="#8B5CF6" strokeWidth="2" />
                  </svg>
                </div>
                <div className="flex justify-between mt-2">
                  {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map(m => (
                    <span key={m} className="text-xs text-zinc-600">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
      <section className="pb-24 lg:pb-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="max-w-5xl mx-auto rounded-3xl bg-zinc-900/40 p-8 lg:p-12"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="rounded-2xl bg-zinc-950/60 p-6 order-2 lg:order-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-zinc-300">Incident Overview</span>
                  <span className="text-xs text-[#8B5CF6]">↑ 12%</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Open Incidents", val: "12", color: "bg-red-500" },
                    { label: "Under Review", val: "8", color: "bg-yellow-500" },
                    { label: "Resolved", val: "47", color: "bg-green-500" },
                    { label: "Compliance Rate", val: "94%", color: "bg-[#8B5CF6]" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${row.color}`} />
                        <span className="text-sm text-zinc-400">{row.label}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Tracking", "Reports", "Categorization", "Insights"].map(tag => (
                    <span key={tag} className="rounded-full bg-zinc-800/60 px-3 py-1 text-xs text-zinc-400">{tag}</span>
                  ))}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold mb-4">Incident & Asset Tracking</h3>
                <p className="text-zinc-400 leading-relaxed mb-6">
                  Track every incident from report to resolution. Manage asset lifecycles, inspections, maintenance schedules, and work orders, all connected in one system.
                </p>
                <Link href="/login" className="inline-flex items-center gap-2 text-[#8B5CF6] font-medium hover:underline">
                  Read More <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile App Showcase ── */}
      <section ref={mobileRef} className="py-24 lg:py-32 relative z-10 overflow-hidden">
        <motion.div style={prefersReducedMotion ? undefined : { y: mobileY }} className="container mx-auto px-4 lg:px-8 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto"
          >
            <motion.div variants={slideLeft}>
              <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
                Safety & assets in your pocket
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                Empower workers with a mobile app for instant incident reporting, asset inspections, QR code scanning, and real-time alerts, even offline.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Smartphone, text: "Report incidents & inspect assets anywhere" },
                  { icon: ClipboardCheck, text: "Complete checklists and audits on-site" },
                  { icon: Bell, text: "Real-time push notifications" },
                  { icon: Cloud, text: "Offline-capable, syncs automatically" },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/10">
                      <item.icon className="h-4 w-4 text-[#8B5CF6]" />
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
              viewport={{ once: true, margin: "-50px" }}
              className="flex justify-center gap-4"
            >
              {[0, 1].map(i => (
                <motion.div
                  key={i}
                  variants={i === 0 ? slideFromLeft : slideFromRight}
                  className={`w-[180px] h-[360px] rounded-[28px] bg-zinc-900 p-2 shadow-xl ${i === 1 ? "mt-12" : ""}`}
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
                          <AlertTriangle className="h-3 w-3 text-[#8B5CF6]" />
                          <span className="text-[10px] font-semibold text-zinc-200">Incidents</span>
                        </div>
                        {[
                          { label: "Gas leak detected", status: "bg-red-500" },
                          { label: "Safety rail damaged", status: "bg-yellow-500" },
                          { label: "PPE check overdue", status: "bg-[#8B5CF6]" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2 rounded-lg bg-zinc-800/60 px-2.5 py-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${item.status}`} />
                            <span className="text-[9px] text-zinc-300">{item.label}</span>
                          </div>
                        ))}
                        <div className="rounded-lg bg-[#8B5CF6]/10 p-2.5 mt-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] text-zinc-400">This week</span>
                            <span className="text-[10px] font-bold text-[#8B5CF6]">12</span>
                          </div>
                          <div className="flex gap-0.5 items-end h-8">
                            {[40, 65, 30, 80, 55, 45, 70].map((h, j) => (
                              <div key={j} className="flex-1 rounded-sm bg-[#8B5CF6]/40" style={{ height: `${h}%` }} />
                            ))}
                          </div>
                        </div>
                      </>) : (<>
                        {/* Phone 2: Asset inspection */}
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-3 w-3 text-[#8B5CF6]" />
                          <span className="text-[10px] font-semibold text-zinc-200">Assets</span>
                        </div>
                        <div className="rounded-lg bg-zinc-800/60 p-2.5">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded bg-[#8B5CF6]/20 flex items-center justify-center">
                              <Wrench className="h-3 w-3 text-[#8B5CF6]" />
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
                            <div className="h-6 w-6 rounded bg-[#8B5CF6]/20 flex items-center justify-center">
                              <Shield className="h-3 w-3 text-[#8B5CF6]" />
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
                        <div className="rounded-lg bg-[#8B5CF6]/10 px-2.5 py-2 flex items-center justify-between">
                          <span className="text-[9px] text-zinc-400">Compliance</span>
                          <span className="text-[10px] font-bold text-[#8B5CF6]">94%</span>
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
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold text-center mb-16"
          >
            Safety Success
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerDramatic}
            className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            <motion.div variants={scaleUp} className="rounded-3xl bg-zinc-900/40 p-8">
              <h3 className="text-xl font-bold mb-3">AI-Powered Insights</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Smart insights that predict risks and asset failures before they happen. Machine learning that improves with your data.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
                Explore
              </Link>
            </motion.div>
            <motion.div variants={scaleUp} className="rounded-3xl bg-zinc-900/40 p-8 text-center">
              <AnimatedCounter value={50} suffix="+" className="text-5xl font-bold text-white mb-3" />
              <p className="text-sm text-zinc-400 mb-6">Industries Served</p>
              <div className="grid grid-cols-4 gap-2">
                {[Building2, Zap, Factory, Ship, Pickaxe, Cross, Fuel, Truck].map((Icon, i) => (
                  <div key={i} className="h-10 w-10 mx-auto rounded-lg bg-zinc-800/40 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#8B5CF6]/70" />
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={scaleUp} className="rounded-3xl bg-zinc-900/40 p-8">
              <h3 className="text-xl font-bold mb-6">Key Statistics</h3>
              <div className="space-y-5">
                {[
                  { label: "Incident Resolution", pct: 92 },
                  { label: "Cost Reduction", pct: 40 },
                  { label: "Compliance Rate", pct: 98 },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">{stat.label}</span>
                      <AnimatedCounter value={stat.pct} suffix="%" className="text-white font-medium text-sm" />
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        className="h-2 rounded-full bg-[#8B5CF6]"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${stat.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" as const }}
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
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={fadeUp} className="mb-16">
              <h2
                className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight text-white mb-4"
                style={{ fontFamily: "var(--font-playfair)" }}
              >
                Your industry. Your safety.
              </h2>
              <p className="text-zinc-400 text-lg">
                Harmoniq adapts to the regulations, hazards, and workflows that matter in your world.
              </p>
            </motion.div>

            {(() => {
              const industries = [
                {
                  icon: HardHat,
                  name: "Construction",
                  description: "Every shift begins with a Job Hazard Analysis right on your crew's phones. Fall protection audits, scaffold inspections, toolbox talks: all tracked automatically. When your superintendent walks a new job site, the pre-task checklist is already loaded based on the scope of work. Photos of hazards get GPS-tagged and timestamped. If OSHA visits, your documentation is audit-ready before they finish parking.",
                  features: ["Job Hazard Analysis (JHA)", "Fall protection audits", "Scaffold inspection checklists", "Toolbox talk tracking", "Photo-documented hazard reporting", "OSHA compliance reports"],
                },
                {
                  icon: Factory,
                  name: "Manufacturing",
                  description: "Lockout/tagout compliance becomes part of the machine changeover process, not a separate safety exercise. Ergonomic assessments for repetitive tasks, machine guarding inspections on every press and conveyor, near-miss reporting from the production floor: everything flows into one dashboard. Floor managers track completion rates in real time without leaving the line. When a line goes down for maintenance, the safety protocol follows automatically.",
                  features: ["Lockout/tagout compliance", "Machine guarding inspections", "Ergonomic assessments", "Near-miss reporting", "Production floor dashboards", "Maintenance safety protocols"],
                },
                {
                  icon: Droplets,
                  name: "Oil & Gas",
                  description: "Permit-to-work management, confined space entry, H2S monitoring: digitized for remote well sites where connectivity is unreliable. Your crew completes inspections offline and everything syncs when signal returns. Hot work permits route through the approval chain on mobile. Contractor orientation checklists ensure every person on your lease is trained and documented before they touch a valve.",
                  features: ["Permit-to-work management", "Confined space entry logs", "Offline inspection sync", "Hot work permit approvals", "Contractor orientation checklists", "H2S monitoring records"],
                },
                {
                  icon: Stethoscope,
                  name: "Healthcare",
                  description: "Infection control rounds, sharps disposal tracking, patient safety audits: all designed for the pace of clinical work. Nurses complete hand hygiene observations between patient rooms in seconds. OSHA bloodborne pathogen compliance is built into the daily workflow, not a quarterly scramble. Incident reports for needle sticks or patient falls trigger the right notifications to risk management immediately.",
                  features: ["Infection control rounds", "Sharps disposal tracking", "Patient safety audits", "Hand hygiene observations", "Bloodborne pathogen compliance", "Incident auto-notifications"],
                },
                {
                  icon: Warehouse,
                  name: "Warehousing & Logistics",
                  description: "Forklift operators scan a QR code to start their pre-shift inspection. Dock safety checks, fire extinguisher rounds, rack integrity audits: all scheduled, all tracked, all completed on mobile. Warehouse managers see which zones have open items before the morning standup. When a rack shows damage, the escalation path from photo to work order to repair confirmation is fully digital.",
                  features: ["QR code asset scanning", "Forklift pre-shift inspections", "Fire extinguisher rounds", "Rack integrity audits", "Zone-based compliance tracking", "Photo-to-work-order escalation"],
                },
                {
                  icon: Pickaxe,
                  name: "Mining",
                  description: "Ground control monitoring, ventilation system checks, blast area safety protocols: built for both underground and surface operations. Each shift starts with a strata assessment on the crew leader's device. PPE compliance is tracked per worker, per shift, per zone. When conditions change mid-shift, updated risk assessments push to every device in the section. Your safety record stays clean because the system catches gaps before regulators do.",
                  features: ["Ground control monitoring", "Ventilation system checks", "Blast area safety protocols", "PPE compliance per worker", "Live risk assessment updates", "Shift-based strata assessments"],
                },
                {
                  icon: UtensilsCrossed,
                  name: "Food & Beverage",
                  description: "HACCP inspections, allergen management, cold chain monitoring with automated escalation. A missed temperature check triggers an alert to the shift supervisor within minutes, not hours. Sanitation audits follow your cleaning schedules automatically. When an allergen protocol changes, every relevant checklist updates across all your facilities. Auditors see a complete digital trail from receiving dock to shipping bay.",
                  features: ["HACCP inspections", "Allergen management", "Cold chain temperature monitoring", "Automated sanitation schedules", "Cross-facility checklist sync", "Full audit trail export"],
                },
                {
                  icon: BatteryCharging,
                  name: "Utilities & Energy",
                  description: "Arc flash compliance, substation inspections, vegetation management workflows for field crews managing critical infrastructure across dispersed service territories. Line clearance audits follow your reliability standards. When a crew arrives at a transformer, the inspection form loads based on equipment class and last service date. Switching procedures and safety protocols travel with the work order, not in a binder back at the office.",
                  features: ["Arc flash compliance", "Substation inspections", "Vegetation management workflows", "Equipment-based form loading", "Line clearance audits", "Mobile switching procedures"],
                },
                {
                  icon: Truck,
                  name: "Transportation",
                  description: "Pre-trip vehicle inspections that DOT auditors actually accept. Drivers complete the walk-around on their phone: tires, brakes, lights, cargo securement. Defects route to maintenance automatically. Dispatchers see fleet compliance at a glance before releasing loads. Driver safety scoring aggregates inspection data, incident history, and training records into one profile. CSA scores improve because the documentation is always current.",
                  features: ["Pre-trip vehicle inspections", "DOT-compliant documentation", "Automatic defect routing", "Fleet compliance dashboard", "Driver safety scoring", "Cargo securement checklists"],
                },
                {
                  icon: GraduationCap,
                  name: "Education",
                  description: "Playground safety checks before the first bell. Chemistry lab inspections before every class period. Emergency drill tracking with timestamps and headcount verification. Visitor management logs who entered, when, and which areas they accessed. Facilities teams manage building safety, grounds maintenance, and fire code compliance from a single dashboard instead of scattered spreadsheets across departments.",
                  features: ["Playground safety checks", "Lab safety inspections", "Emergency drill tracking", "Visitor management logs", "Fire code compliance", "Facilities maintenance dashboard"],
                },
              ];
              const current = industries[selectedIndustry];
              return (
                <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-0 lg:gap-12">
                  <div className="flex flex-col">
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
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {current.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-zinc-300">
                          <div className="h-1 w-1 rounded-full bg-[#8B5CF6] shrink-0" />
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

      {/* ── Platform Benefits ── */}
      <section ref={benefitsRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: benefitsY }} className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="max-w-5xl mx-auto rounded-3xl bg-zinc-900/40 p-8 lg:p-12"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-6 text-white">
                  Built for teams that take safety & asset management seriously
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-8">
                  Whether you have 10 employees or 10,000, Harmoniq scales with your organization, managing safety incidents, asset lifecycles, and compliance in one place.
                </p>
                <div className="space-y-3">
                  {[
                    "Country-specific compliance (OSHA, Arbowet, AFS)",
                    "Mobile-first employee app with offline support",
                    "QR code asset tracking and instant inspections",
                    "Automated alerts for certifications & maintenance",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                      </div>
                      <span className="text-sm text-zinc-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-950/60 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Incidents", val: "12" },
                    { label: "Inspections", val: "48" },
                    { label: "Compliance", val: "94%" },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-zinc-900/60 p-3 text-center">
                      <p className="text-lg font-bold text-[#8B5CF6]">{s.val}</p>
                      <p className="text-xs text-zinc-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-32 rounded-lg bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/2" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
      <section ref={faqRef} className="py-24 lg:py-32 relative z-10">
        <motion.div style={prefersReducedMotion ? undefined : { y: faqY }} className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="space-y-4"
          >
            {faqs.map(faq => (
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
              <h4 className="font-semibold text-white text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                {["Features", "Integrations", "Mobile App", "Changelog"].map(item => (
                  <li key={item}><button type="button" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Company</h4>
              <ul className="space-y-3">
                {["About", "Blog", "Careers", "Contact"].map(item => (
                  <li key={item}><button type="button" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="/privacy" className="text-sm text-zinc-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-zinc-500 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="text-sm text-zinc-500 hover:text-white transition-colors">Cookie Policy</Link></li>
                <li><Link href="/gdpr" className="text-sm text-zinc-500 hover:text-white transition-colors">GDPR</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-600">© {new Date().getFullYear()} Harmoniq. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-zinc-600 hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-sm text-zinc-600 hover:text-white transition-colors">Terms</Link>
              <Link href="/cookies" className="text-sm text-zinc-600 hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
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
      viewport={{ once: true }}
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
            <Mail className="h-10 w-10 text-[#8B5CF6] mx-auto mb-4" />
            <h2 className="text-4xl sm:text-5xl font-bold leading-tight mb-3">
              Join the Waitlist
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed mb-8">
              Harmoniq is in private beta. Drop your email and we&apos;ll let you know when it&apos;s your turn.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-full bg-zinc-800/60 px-5 py-3 text-base text-white placeholder-zinc-500 border border-zinc-700/50 focus:border-[#8B5CF6] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8B5CF6] px-8 py-3 text-base font-semibold text-white hover:bg-[#7c4fe0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Joining\u2026" : "Join Waitlist"}
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
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
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
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, value]);

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  );
}
