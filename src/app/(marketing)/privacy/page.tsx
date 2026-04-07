import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Harmoniq Safety",
  description: "Learn how Harmoniq Safety collects, uses, stores, and protects information on our website and platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: April 7, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-zinc-300 leading-relaxed">
              Harmoniq Safety (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides a workplace safety and operations platform for incident reporting,
              inspections, compliance tracking, and asset management. This policy explains what personal information we collect through our public website
              and our platform, why we collect it, and how we protect it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3 text-zinc-200">2.1 Information you provide directly</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Name, business email address, company name, role, and other contact details</li>
              <li>Messages you send when requesting a demo, contacting sales, or asking for support</li>
              <li>Account details, profile information, and uploaded content when your organization uses the platform</li>
              <li>Operational records you or your team create, such as incidents, inspections, checklists, corrective actions, and asset information</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6 text-zinc-200">2.2 Information we collect automatically</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Device, browser, language, and approximate usage information when you visit our public website</li>
              <li>Consent preferences for analytics and cookies</li>
              <li>Security, audit, and diagnostic information needed to protect our services and investigate misuse</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6 text-zinc-200">2.3 Information we do not sell</h3>
            <p className="text-zinc-300 leading-relaxed">
              We do not sell your personal information. We use it to operate the website, provide the platform, support customers, and improve service quality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Information</h2>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Respond to enquiries, demo requests, and support questions</li>
              <li>Provide, secure, and maintain the Harmoniq Safety platform</li>
              <li>Authenticate users, manage permissions, and keep audit trails</li>
              <li>Measure public website performance and improve content after consent has been given where required</li>
              <li>Meet legal, regulatory, contractual, and security obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Sharing and Disclosure</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              We share information only when needed to operate the service or comply with the law.
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Your organization:</strong> authorized administrators, managers, and users in the same workspace may access data needed for operations</li>
              <li><strong>Service providers:</strong> infrastructure, analytics, communications, and support providers acting on our instructions</li>
              <li><strong>Legal and safety needs:</strong> when disclosure is required by law, regulation, court order, or to protect people, property, or service integrity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Cookies and Website Analytics</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Our public website uses cookies and similar technologies to keep the site working, remember consent choices, and measure website usage.
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Essential cookies help with security and basic site functionality</li>
              <li>Analytics cookies are only used when your consent choices allow them</li>
              <li>You can review more detail on our <Link href="/cookies" className="text-violet-400 hover:text-violet-300">Cookie Policy</Link> page</li>
              <li>You can change your consent preferences at any time through the cookie banner controls</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-zinc-300 leading-relaxed">
              We keep personal information only for as long as needed for the purposes described in this policy, including account administration,
              customer support, security investigations, and legal or regulatory retention obligations. Operational safety records may be retained for
              longer periods where regulations or customer contracts require it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights and Choices</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Depending on your location and relationship with us, you may have rights to:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Access, correct, or delete certain personal data</li>
              <li>Object to or restrict some processing activities</li>
              <li>Receive a portable export where applicable</li>
              <li>Withdraw consent for optional analytics or marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Security and Transfers</h2>
            <p className="text-zinc-300 leading-relaxed">
              We use technical and organizational safeguards designed to protect data, including access controls, encryption in transit, logging,
              and role-based permissions. Where we rely on vendors or cross-border processing, we use appropriate contractual and technical measures to
              protect data in line with applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p className="text-zinc-300 leading-relaxed">
              For privacy questions or requests, contact us at:<br />
              <a href="mailto:privacy@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">privacy@harmoniqsafety.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
