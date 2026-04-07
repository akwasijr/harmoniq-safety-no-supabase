import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Disclaimer | Harmoniq Safety",
  description: "Important information about the public Harmoniq Safety website, its content, and its intended use.",
};

export default function SiteDisclaimerPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold mb-8">Site Disclaimer</h1>
        <p className="text-zinc-400 mb-8">Last updated: April 7, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Website Content Is Informational</h2>
            <p className="text-zinc-300 leading-relaxed">
              The public Harmoniq Safety website is provided for general information about our company, platform, services, and product capabilities.
              Content on this website is not intended to be a substitute for professional legal, regulatory, workplace safety, medical, engineering,
              or compliance advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. No Professional or Regulatory Advice</h2>
            <p className="text-zinc-300 leading-relaxed">
              References to safety practices, compliance workflows, inspection processes, or analytics on this website are meant to describe how the
              platform can support operational teams. They do not by themselves ensure compliance with OSHA, GDPR, local employment law, or any other
              regulatory obligation. Organizations remain responsible for their own governance, procedures, and decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Accuracy and Availability</h2>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>We aim to keep the website accurate and up to date, but we do not guarantee that all content is complete, current, or error-free</li>
              <li>Features, product descriptions, pricing references, and roadmap items may change without notice</li>
              <li>We may update, suspend, or remove parts of the website at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. External Links</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              This website may link to third-party websites, documentation, or services for convenience. We do not control those sites and are not
              responsible for their content, practices, availability, or privacy handling.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Product Use and Customer Responsibility</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Harmoniq Safety is a software platform that helps organizations document work, track activity, and improve visibility. Customers remain
              responsible for:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li>Defining and enforcing their own safety procedures and controls</li>
              <li>Making operational and regulatory decisions based on qualified internal or external advice</li>
              <li>Reviewing reports, alerts, and outputs before relying on them in live environments</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. No Warranties</h2>
            <p className="text-zinc-300 leading-relaxed">
              The public website is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest extent permitted by law, we disclaim all
              warranties, whether express or implied, including warranties of accuracy, merchantability, fitness for a particular purpose, and
              non-infringement in relation to website content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <p className="text-zinc-300 leading-relaxed">
              To the fullest extent permitted by law, Harmoniq Safety is not liable for losses arising from reliance on the public website, temporary
              service interruption, missing or outdated content, or third-party linked resources. Nothing on this page limits liability that cannot be
              excluded under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <p className="text-zinc-300 leading-relaxed">
              Unless stated otherwise, website content, branding, designs, and materials are owned by Harmoniq Safety or its licensors. You may not copy,
              republish, or commercially exploit website materials without permission, except as allowed by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p className="text-zinc-300 leading-relaxed">
              If you have questions about this site disclaimer, contact us at:<br />
              <a href="mailto:legal@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">legal@harmoniqsafety.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
