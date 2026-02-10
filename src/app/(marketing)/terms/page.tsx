import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Harmoniq Safety",
  description: "Terms and conditions for using the Harmoniq Safety platform.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-zinc-400 mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              By accessing or using Harmoniq Safety (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-zinc-300 leading-relaxed">
              Harmoniq Safety is a workplace safety and asset management platform that enables organizations to report incidents, conduct inspections, manage assets, track corrective actions, and ensure regulatory compliance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Subscription & Billing</h2>
            <h3 className="text-xl font-medium mb-3 text-zinc-200">4.1 Free Trial</h3>
            <p className="text-zinc-300 leading-relaxed mb-4">
              New customers receive a 60-day free trial with full access to all features. No credit card is required for the trial period.
            </p>
            
            <h3 className="text-xl font-medium mb-3 text-zinc-200">4.2 Paid Subscriptions</h3>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Subscriptions are billed monthly or annually in advance</li>
              <li>Prices are subject to change with 30 days notice</li>
              <li>Refunds are provided on a pro-rata basis for annual plans</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Submit false or misleading safety reports</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Reverse engineer or copy the Service</li>
              <li>Share account credentials with unauthorized users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Ownership</h2>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Your Data:</strong> You retain ownership of all data you submit to the Service</li>
              <li><strong>License:</strong> You grant us a license to process your data to provide the Service</li>
              <li><strong>Export:</strong> You may export your data at any time in standard formats</li>
              <li><strong>Deletion:</strong> Upon account termination, we will delete your data within 90 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-zinc-300 leading-relaxed">
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform scheduled maintenance with advance notice. We are not liable for any downtime or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-zinc-300 leading-relaxed">
              Harmoniq Safety is a tool to assist with safety management but does not replace professional safety expertise. We are not liable for workplace incidents, regulatory fines, or any indirect, incidental, or consequential damages arising from use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-zinc-300 leading-relaxed">
              Either party may terminate the agreement with 30 days written notice. We may suspend or terminate accounts that violate these terms immediately. Upon termination, you may request an export of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update these terms from time to time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p className="text-zinc-300 leading-relaxed">
              For questions about these terms, contact us at:<br />
              <a href="mailto:legal@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">legal@harmoniqsafety.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
