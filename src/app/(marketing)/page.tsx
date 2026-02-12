"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
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
} from "lucide-react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const slideRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

const scaleUp = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const staggerSlow = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function Home() {
  const ipadRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ipadRef,
    offset: ["start 0.8", "end 0.5"],
  });
  const ipadRotate = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const ipadY = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const ipadScale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  const heroRef = useRef<HTMLDivElement>(null);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-black text-white overflow-x-hidden">
      {/* Video background — desktop only */}
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
            <a href="#services" className="text-sm text-zinc-400 hover:text-white transition-colors">Solutions</a>
            <a href="#stats" className="text-sm text-zinc-400 hover:text-white transition-colors">Resources</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline text-sm text-zinc-400 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login" className="rounded-full bg-[#8B5CF6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
              Get Started
            </Link>
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
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8B5CF6] px-8 py-3.5 text-base font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/60 px-8 py-3.5 text-base font-medium text-white hover:bg-zinc-800 transition-colors">
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
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUp}
        className="py-24 lg:py-32 relative z-10"
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light leading-snug text-zinc-300">
              Trusted by <span className="text-white font-semibold">operations teams</span> across industries worldwide.
              A growing community committed to <span className="text-[#8B5CF6] font-semibold">protecting their people and assets</span> while
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

      {/* ── Features — Floating Pills Layout ── */}
      <section id="features" className="py-24 lg:py-40 relative z-10 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="relative max-w-6xl mx-auto min-h-[600px] lg:min-h-[700px] flex items-center justify-center">

            {/* Floating feature pills — parallax fly-in from off-screen */}
            {features.map((feature, i) => {
              const isLeft = i % 2 === 0;
              const isTop = i < 4;
              return (
                <motion.div
                  key={feature.title}
                  initial={{
                    opacity: 0,
                    x: isLeft ? -60 : 60,
                    y: isTop ? -20 : 20,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                    y: 0,
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.8, delay: i * 0.07, ease: "easeOut" as const }}
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
                <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8B5CF6] px-8 py-3.5 text-base font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
                  Get Started
                </Link>
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
        </div>
      </section>

      {/* ── Testimonial + Screenshot Section ── */}
      <section className="py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
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
                    &ldquo;Harmoniq transformed our workplace safety — incident reporting went from days to minutes.&rdquo;
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
        </div>
      </section>

      {/* ── Services Card 1 — Analytics ── */}
      <section id="services" className="py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
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
        </div>
      </section>

      {/* ── Services Card 2 — Tracking ── */}
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
                  Track every incident from report to resolution. Manage asset lifecycles, inspections, maintenance schedules, and work orders — all connected in one system.
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
      <section className="py-24 lg:py-32 relative z-10 overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8 relative">
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
                Empower workers with a mobile app for instant incident reporting, asset inspections, QR code scanning, and real-time alerts — even offline.
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
            {/* Two phone frames */}
            <motion.div variants={slideRight} className="flex justify-center gap-4">
              {[0, 1].map(i => (
                <div key={i} className={`w-[180px] h-[360px] rounded-[28px] bg-zinc-900 p-2 shadow-xl ${i === 1 ? "mt-12" : ""}`}>
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
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats 3-Column ── */}
      <section id="stats" className="py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
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
            variants={staggerSlow}
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
        </div>
      </section>

      {/* ── Platform Benefits ── */}
      <section className="py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="max-w-5xl mx-auto rounded-3xl bg-zinc-900/40 p-8 lg:p-12"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">
                  Built for teams that take safety & asset management{" "}
                  <span className="text-[#8B5CF6]">seriously</span>
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-8">
                  Whether you have 10 employees or 10,000, Harmoniq scales with your organization — managing safety incidents, asset lifecycles, and compliance in one place.
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
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 lg:py-32 relative z-10">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
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
        </div>
      </section>

      {/* ── Pre-footer CTA ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="py-24 lg:py-32 relative z-10"
      >
        <div className="container mx-auto px-4 lg:px-8 relative text-center max-w-3xl">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Ready to streamline safety & asset management?
          </h2>
          <p className="mt-6 text-lg text-zinc-400 leading-relaxed">
            Join hundreds of organizations that use Harmoniq to protect their teams, manage assets, and stay compliant.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#8B5CF6] px-8 py-3.5 text-base font-semibold text-white hover:bg-[#7c4fe0] transition-colors">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-800/60 px-8 py-3.5 text-base font-medium text-white hover:bg-zinc-800 transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </motion.section>

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
                  <a key={social} href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/50 text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
                    {social}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                {["Features", "Integrations", "Mobile App", "Changelog"].map(item => (
                  <li key={item}><a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Company</h4>
              <ul className="space-y-3">
                {["About", "Blog", "Careers", "Contact"].map(item => (
                  <li key={item}><a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="/privacy" className="text-sm text-zinc-500 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="text-sm text-zinc-500 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/cookies" className="text-sm text-zinc-500 hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="/gdpr" className="text-sm text-zinc-500 hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-600">© {new Date().getFullYear()} Harmoniq. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/privacy" className="text-sm text-zinc-600 hover:text-white transition-colors">Privacy</a>
              <a href="/terms" className="text-sm text-zinc-600 hover:text-white transition-colors">Terms</a>
              <a href="/cookies" className="text-sm text-zinc-600 hover:text-white transition-colors">Cookies</a>
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
    q: "How quickly can we get started?",
    a: "Most teams are up and running within minutes. Create your company, invite your team, and start reporting — no complex setup required.",
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
    a: "Currently available in English, Dutch, and Swedish — with locale-aware dates, numbers, and compliance forms for each region.",
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
