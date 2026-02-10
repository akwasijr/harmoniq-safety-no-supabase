import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GDPR Compliance | Harmoniq Safety",
  description: "Learn how Harmoniq Safety complies with the General Data Protection Regulation (GDPR).",
};

export default function GDPRPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold mb-8">GDPR Compliance</h1>
        <p className="text-zinc-400 mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Our Commitment to GDPR</h2>
            <p className="text-zinc-300 leading-relaxed">
              Harmoniq Safety is committed to protecting the privacy and rights of individuals in accordance with the General Data Protection Regulation (GDPR). This page explains how we comply with GDPR requirements and your rights as a data subject.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Legal Basis for Processing</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              We process personal data under the following legal bases:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Contract Performance:</strong> To provide our safety management services to you and your organization</li>
              <li><strong>Legal Obligation:</strong> To comply with workplace safety regulations and record-keeping requirements</li>
              <li><strong>Legitimate Interest:</strong> To improve our services, prevent fraud, and ensure security</li>
              <li><strong>Consent:</strong> For marketing communications (you may withdraw at any time)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Your GDPR Rights</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Under GDPR, you have the following rights:
            </p>
            
            <div className="space-y-4">
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Right of Access (Article 15)</h3>
                <p className="text-zinc-400">You can request a copy of all personal data we hold about you.</p>
              </div>
              
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Right to Rectification (Article 16)</h3>
                <p className="text-zinc-400">You can request correction of inaccurate or incomplete data.</p>
              </div>
              
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Right to Erasure (Article 17)</h3>
                <p className="text-zinc-400">You can request deletion of your data (&quot;right to be forgotten&quot;), subject to legal retention requirements.</p>
              </div>
              
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Right to Restrict Processing (Article 18)</h3>
                <p className="text-zinc-400">You can request we limit how we use your data in certain circumstances.</p>
              </div>
              
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Right to Data Portability (Article 20)</h3>
                <p className="text-zinc-400">You can request your data in a machine-readable format to transfer to another service.</p>
              </div>
              
              <div className="bg-zinc-900 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">Right to Object (Article 21)</h3>
                <p className="text-zinc-400">You can object to processing based on legitimate interests or for direct marketing.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Processing Agreement</h2>
            <p className="text-zinc-300 leading-relaxed">
              For enterprise customers, we offer a Data Processing Agreement (DPA) that outlines our obligations as a data processor. Contact us to request a signed DPA for your organization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Transfers</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              If we transfer data outside the European Economic Area (EEA), we ensure appropriate safeguards:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Standard Contractual Clauses (SCCs) approved by the EU Commission</li>
              <li>Adequacy decisions (for countries deemed adequate by the EU)</li>
              <li>Binding Corporate Rules (where applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Protection Officer</h2>
            <p className="text-zinc-300 leading-relaxed">
              For GDPR-related inquiries, you may contact our Data Protection team at:<br />
              <a href="mailto:dpo@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">dpo@harmoniqsafety.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Exercising Your Rights</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              To exercise any of your GDPR rights:
            </p>
            <ol className="list-decimal pl-6 text-zinc-300 space-y-2">
              <li>Email us at <a href="mailto:privacy@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">privacy@harmoniqsafety.com</a></li>
              <li>Include your full name and the email associated with your account</li>
              <li>Specify which right(s) you wish to exercise</li>
              <li>We will respond within 30 days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Supervisory Authority</h2>
            <p className="text-zinc-300 leading-relaxed">
              If you believe we have not adequately addressed your concerns, you have the right to lodge a complaint with your local Data Protection Authority (DPA). In the Netherlands, this is the Autoriteit Persoonsgegevens (AP).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Security Measures</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and role-based permissions</li>
              <li>Employee security training</li>
              <li>Incident response procedures</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
