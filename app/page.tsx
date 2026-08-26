import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { cache, Suspense } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  LayoutDashboard,
  MessageCircle,
  PenTool,
} from "lucide-react";

import { ClosingCta, SiteFooter } from "@/components/landing/closing";
import { ProductJourney } from "@/components/landing/product-journey";
import { StudioFeatures } from "@/components/landing/studio-features";
import { Logo } from "@/components/logo";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  defaultDescription,
  organizationSchema,
  webApplicationSchema,
  websiteSchema,
} from "@/lib/seo";

const landingDescription =
  "UpClass is a classroom LMS for teachers and schools to manage assignments, quizzes, messages, resources, collaboration, and student submissions.";

export const metadata: Metadata = {
  title: "Classroom LMS for Teachers and Schools | UpClass",
  description: landingDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: "UpClass | Classroom LMS for Teachers and Schools",
    description: landingDescription,
    url: "/",
  },
  twitter: {
    title: "UpClass | Classroom LMS for Teachers and Schools",
    description: landingDescription,
  },
};

const getIsAuthenticated = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session?.user);
});

function Brand() {
  return (
    <Logo
      href="/"
      className="landing-brand"
      textClassName="landing-brand-name"
    />
  );
}

function SignedOutActions() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/sign-in">Log in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/sign-up">Create your class</Link>
      </Button>
    </div>
  );
}

async function HeaderActions() {
  return (await getIsAuthenticated()) ? (
    <Button size="sm" asChild>
      <Link href="/entry">
        Open workspace <LayoutDashboard className="size-3.5" />
      </Link>
    </Button>
  ) : (
    <SignedOutActions />
  );
}

async function HeroActions() {
  return (await getIsAuthenticated()) ? (
    <>
      <Button size="lg" asChild>
        <Link href="/entry">
          Open your workspace <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="#features">See classroom tools</Link>
      </Button>
    </>
  ) : (
    <>
      <Button size="lg" asChild>
        <Link href="/sign-up">
          Create your class <ArrowRight className="size-4" />
        </Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="#features">See how it works</Link>
      </Button>
    </>
  );
}

function ProductArtifact() {
  return (
    <div className="artifact-wrap" aria-label="UpClass classroom LMS preview">
      <div className="artifact-glow" />
      <div className="artifact-form">
        <span className="artifact-dot" />
        <span className="artifact-field">
          <FileText className="size-4" /> Share an update with Biology 101
        </span>
        <span className="artifact-send">Post to class</span>
      </div>
      <div className="artifact-window">
        <div className="artifact-bar">
          <span className="flex gap-1.5">
            <i />
            <i />
            <i />
          </span>
          <span>upclass.app / biology-101</span>
          <span className="artifact-live">Synced</span>
        </div>
        <div className="artifact-body">
          <aside>
            <div className="artifact-school">
              <span className="artifact-mark">U</span>
              <div>
                <b>Springfield High</b>
                <small>Classroom LMS</small>
              </div>
            </div>
            {["Overview", "Classes", "Messages", "Resources"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`artifact-nav ${index === 1 ? "active" : ""}`}
                >
                  <span className="size-1.5 rounded-full bg-current opacity-50" />
                  {item}
                  {item === "Messages" && <em>2</em>}
                </div>
              ),
            )}
          </aside>
          <main>
            <div className="artifact-course">
              <span className="course-swatch" />
              <div>
                <small>CLASS WORKSPACE</small>
                <h3>Biology 101</h3>
                <p>Science / 28 students / Tue &amp; Thu</p>
              </div>
              <span className="artifact-teaching">Teacher view</span>
            </div>
            <div className="artifact-tabs">
              <span className="selected">Updates</span>
              <span>Assignments</span>
              <span>Quizzes</span>
              <span>People</span>
            </div>
            <div className="artifact-post">
              <div className="post-icon">
                <MessageCircle className="size-4" />
              </div>
              <div>
                <b>Lab groups are ready</b>
                <p>
                  Review the protocol and bring your pre-lab diagram on
                  Thursday.
                </p>
                <small>Dr. Sarah Patel / Today at 9:12 AM</small>
              </div>
            </div>
            <div className="artifact-assignment">
              <div className="post-icon warm">
                <PenTool className="size-4" />
              </div>
              <div>
                <b>Cell diagram assignment</b>
                <p>Due tomorrow / 10 points</p>
              </div>
              <span>24 of 28 submitted</span>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div id="top" className="landing-page min-h-dvh overflow-hidden">
      <JsonLd
        data={[
          websiteSchema,
          organizationSchema,
          { ...webApplicationSchema, description: defaultDescription },
        ]}
      />
      <div className="landing-announcement" role="status">
        <span className="landing-announcement-label">Beta</span>
        <span>
          UpClass is in active development, and teachers can start using it
          today.
        </span>
      </div>
      <header className="landing-header">
        <div className="landing-container flex h-14 items-center justify-between">
          <Brand />
          <nav className="landing-links" aria-label="Primary">
            <Link href="#features">Features</Link>
            <Link href="#workflow">How it works</Link>
            <Link href="#ai-assistant">AI assistant</Link>
            <Link href="#schools">For schools</Link>
            <Link href="#faq">FAQ</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/contact" className="landing-support">
              Contact us
            </Link>
            <Suspense fallback={<SignedOutActions />}>
              <HeaderActions />
            </Suspense>
          </div>
        </div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-container hero-inner">
            <div className="hero-copy">
              <div className="hero-kicker">
                CLASSROOM LMS FOR TEACHERS
              </div>
              <h1>
                One place
                <br />
                <span>to run your class.</span>
              </h1>
              <p>
                UpClass brings assignments, messages, quizzes, resources, and
                collaboration into one teaching workspace, so student
                submissions and the next task are easy to find.
              </p>
              <div className="hero-actions">
                <Suspense fallback={<SignedOutActions />}>
                  <HeroActions />
                </Suspense>
              </div>
              <div className="hero-proof">
                <span>
                  <Check /> Free to start
                </span>
                <span>
                  <Check /> Teacher approval for AI
                </span>
                <span>
                  <Check /> Offline support
                </span>
              </div>
            </div>
            <ProductArtifact />
          </div>
        </section>
        <StudioFeatures />
        <ProductJourney />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
