import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Harmoniq Safety",
  description: "Learn how Harmoniq Safety uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: February 10, 2026</p>

        <div className="prose prose-invert prose-zinc max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies?</h2>
            <p className="text-zinc-300 leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Harmoniq Safety uses cookies for the following purposes:
            </p>
            
            <h3 className="text-xl font-medium mb-3 text-zinc-200">2.1 Essential Cookies</h3>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Required for the platform to function properly. These cannot be disabled.
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-6">
              <li><strong>Authentication:</strong> Keep you logged in securely</li>
              <li><strong>Security:</strong> Prevent cross-site request forgery (CSRF)</li>
              <li><strong>Session:</strong> Maintain your session state</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-zinc-200">2.2 Functional Cookies</h3>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Remember your preferences and settings.
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2 mb-6">
              <li><strong>Language:</strong> Remember your language preference</li>
              <li><strong>Theme:</strong> Remember dark/light mode preference</li>
              <li><strong>Filters:</strong> Remember dashboard filter selections</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-zinc-200">2.3 Analytics Cookies</h3>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Help us understand how users interact with our platform.
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Usage analytics:</strong> Page views, feature usage</li>
              <li><strong>Performance:</strong> Load times, error tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cookie List</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-zinc-300">
                <thead className="border-b border-zinc-700">
                  <tr>
                    <th className="py-3 pr-4">Cookie Name</th>
                    <th className="py-3 pr-4">Purpose</th>
                    <th className="py-3 pr-4">Duration</th>
                    <th className="py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-sm">harmoniq_session</td>
                    <td className="py-3 pr-4">Authentication session</td>
                    <td className="py-3 pr-4">Session</td>
                    <td className="py-3">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-sm">harmoniq_csrf</td>
                    <td className="py-3 pr-4">Security token</td>
                    <td className="py-3 pr-4">Session</td>
                    <td className="py-3">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-sm">theme</td>
                    <td className="py-3 pr-4">Theme preference</td>
                    <td className="py-3 pr-4">1 year</td>
                    <td className="py-3">Functional</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-sm">locale</td>
                    <td className="py-3 pr-4">Language preference</td>
                    <td className="py-3 pr-4">1 year</td>
                    <td className="py-3">Functional</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-sm">_ga</td>
                    <td className="py-3 pr-4">Google Analytics ID</td>
                    <td className="py-3 pr-4">2 years</td>
                    <td className="py-3">Analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Managing Cookies</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              You can control cookies through your browser settings:
            </p>
            <ul className="list-disc pl-6 text-zinc-300 space-y-2">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
            <p className="text-zinc-300 leading-relaxed mt-4">
              Note: Disabling essential cookies may prevent you from using Harmoniq Safety.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Cookies</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may use third-party services that set their own cookies, including Google Analytics for usage analytics. These third parties have their own privacy policies governing their use of cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Updates to This Policy</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
            <p className="text-zinc-300 leading-relaxed">
              For questions about our use of cookies, contact us at:<br />
              <a href="mailto:privacy@harmoniqsafety.com" className="text-violet-400 hover:text-violet-300">privacy@harmoniqsafety.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
