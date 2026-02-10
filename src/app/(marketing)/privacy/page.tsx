import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Harmoniq Safety",
  description: "Learn how Harmoniq Safety collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-zinc-300 leading-relaxed">
              Harmoniq Safety (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our workplace safety management platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3 text-zinc-200">2.1 Personal Information</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Name, email address, and contact information</li>
              <li>Company name and job title</li>
              <li>Account credentials</li>
              <li>Profile photos (if uploaded)</li>
            </ul>
            
            <h3 className="text-xl font-medium mb-3 mt-6 text-zinc-200">2.2 Safety & Operational Data</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Incident reports and safety observations</li>
              <li>Inspection and checklist data</li>
              <li>Asset and equipment information</li>
              <li>Location data for incidents and assets</li>
              <li>Photos and media attached to reports</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6 text-zinc-200">2.3 Technical Data</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Usage patterns and analytics</li>
              <li>Cookies and similar technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Provide and maintain our safety management platform</li>
              <li>Process and respond to incident reports</li>
              <li>Generate safety analytics and compliance reports</li>
              <li>Send notifications about tasks, incidents, and updates</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations and safety regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Your Organization:</strong> Managers and administrators within your company</li>
              <li><strong>Service Providers:</strong> Cloud hosting, analytics, and support services</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-zinc-300 leading-relaxed">
              We retain your data for as long as your account is active or as needed for legal compliance. Safety records may be retained longer to meet regulatory requirements (e.g., OSHA record-keeping requirements of 5+ years).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Security</h2>
            <p className="text-zinc-300 leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest, access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-zinc-300 leading-relaxed">
              For privacy-related inquiries, contact us at:<br />
              <a href="mailto:privacy@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">privacy@harmoniqsafety.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
