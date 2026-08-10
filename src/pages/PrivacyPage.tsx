import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import Button from "../components/ui/Button";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      {/* Simple header */}
      <header className="border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 cursor-pointer"
            aria-label="Back to home"
          >
            <img src="/logo.png" alt="BlackBox COO Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0" />
            <span className="font-semibold text-sm text-text-primary hidden sm:inline">BlackBox</span>
            <span className="text-xs font-medium text-accent hidden sm:inline">COO</span>
          </button>
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/")}>
            Back
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent/20 flex items-center justify-center">
            <Shield size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">Privacy Policy</h1>
            <p className="text-sm text-text-muted mt-0.5">Last updated: January 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Introduction</h2>
            <p>
              BlackBox COO ("we," "our," or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our application and website.
            </p>
            <p className="mt-2">
              By using BlackBox COO, you agree to the collection and use of information in
              accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. Information We Collect</h2>
            <p className="mb-2">We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account Information:</strong> Email address, full name, and
                authentication credentials when you create an account.
              </li>
              <li>
                <strong>Business Data:</strong> Sales records, expense data, inventory
                information, customer data, and other business information you upload or
                enter into the platform.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you interact with our
                application, including pages visited, features used, and time spent.
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating system, and
                device type for analytics and compatibility purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. How We Use Your Information</h2>
            <p className="mb-2">We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To provide, operate, and maintain our AI-powered business analysis service.</li>
              <li>To generate executive reports, business insights, and recommendations.</li>
              <li>To improve, personalize, and expand our features and functionality.</li>
              <li>To communicate with you about updates, security alerts, and support.</li>
              <li>To detect, prevent, and address technical issues or fraudulent activity.</li>
            </ul>
            <p className="mt-2">
              <strong>Important:</strong> Your business data is never used to train or
              improve third-party AI models. AI analysis is performed per-request and
              is not retained for model training.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption at rest
              and in transit. We use Supabase for database hosting, which provides
              automated backups, encryption, and access controls. We implement
              appropriate technical and organizational measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active.
              Business data is retained until you request deletion or your account is
              deleted. You can request deletion of your data at any time by contacting
              our support team.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Third-Party Services</h2>
            <p className="mb-2">We may use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Supabase</strong> — Authentication, database, and file storage.</li>
              <li><strong>Google Gemini API</strong> — AI-powered analysis (only when you provide an API key).</li>
              <li><strong>Vite / Netlify</strong> — Application hosting and deployment.</li>
            </ul>
            <p className="mt-2">
              These third parties have their own privacy policies governing the use of
              your data. We encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Your Rights</h2>
            <p className="mb-2">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data ("right to be forgotten").</li>
              <li>Object to or restrict processing of your data.</li>
              <li>Data portability.</li>
              <li>Withdraw consent at any time.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, please contact us at the email address below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management.
              We do not use tracking cookies or third-party advertising cookies.
              You can configure your browser to reject cookies, but this may affect
              the functionality of the application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you
              of any changes by posting the new policy on this page and updating the
              "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">10. Contact</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us
              at{" "}
              <a
                href="mailto:privacy@blackboxcoo.app"
                className="text-accent hover:underline"
              >
                privacy@blackboxcoo.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} BlackBox COO. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/privacy")}
              className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}