import { headers } from "next/headers";
import Link from "next/link";
import { cache, Suspense } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

const getIsAuthenticated = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session?.user);
});

function SignedOutCta() {
  return (
    <Button size="lg" className="closing-cta-button" asChild>
      <Link href="/sign-up">Create your class</Link>
    </Button>
  );
}

async function ClosingCtaButton() {
  return (await getIsAuthenticated()) ? (
    <Button size="lg" className="closing-cta-button" asChild>
      <Link href="/entry">Open your workspace</Link>
    </Button>
  ) : (
    <SignedOutCta />
  );
}

export function ClosingCta() {
  return (
    <section className="closing-band" aria-labelledby="closing-heading">
      <div className="landing-container">
        <div className="closing-card">
          <p className="closing-pill">Ready for your next class</p>
          <h2 id="closing-heading">
            <span>Bring your teacher workflow</span>
            <span>
              together in <em>UpClass</em>.
            </span>
          </h2>
          <p className="closing-lead">
            Create a class, invite your students, and manage assignments,
            messages, quizzes, resources, and collaboration from one classroom
            LMS.
          </p>
          <Suspense fallback={<SignedOutCta />}>
            <ClosingCtaButton />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="landing-container">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <Logo
              href="/"
              className="landing-brand"
              textClassName="landing-brand-name"
            />
            <p>
              A classroom LMS for assignments, quizzes, resources, messages, and
              student work.
            </p>
            <a href="mailto:support@upclass.xyz">support@upclass.xyz</a>
          </div>
          <nav className="site-footer-col" aria-label="Product">
            <h3>Product</h3>
            <Link href="#features">Features</Link>
            <Link href="#workflow">How it works</Link>
            <Link href="#ai-assistant">AI assistant</Link>
            <Link href="/sign-up">Create your class</Link>
            <Link href="#schools">For schools</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <nav className="site-footer-col" aria-label="Legal">
            <h3>Legal</h3>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="#top">Back to top</Link>
          </nav>
        </div>
        <div className="site-footer-bar">
          <span>&copy; 2026 UpClass. All rights reserved.</span>
          <Link href="/contact">Support</Link>
        </div>
      </div>
    </footer>
  );
}
