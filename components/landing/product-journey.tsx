import Link from "next/link";

import { ArrowRight, Check, FileText, MessageCircle, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function ProductJourney() {
  return (
    <>
      <section className="journey-section" id="workflow" aria-labelledby="workflow-heading">
        <div className="landing-container journey-grid">
          <div>
            <p className="journey-eyebrow">HOW IT WORKS</p>
            <h2 id="workflow-heading">Plan the work once, then keep the class moving.</h2>
            <p className="journey-lead">A simple loop for the parts of teaching that happen every week.</p>
            <Button asChild className="journey-button"><Link href="/sign-up">Create your class <ArrowRight className="size-4" /></Link></Button>
          </div>
          <div className="workflow-preview" aria-label="Teacher assignment workflow preview">
            <div className="workflow-preview-bar"><span>Biology 101</span><b>Assignment flow</b></div>
            <div className="workflow-flow">
              <div className="workflow-stage"><span className="workflow-stage-number">01</span><small>TEACHER</small><strong>Post the work</strong><div className="workflow-stage-ui"><FileText /><span>Cell diagram<br /><small>Due tomorrow</small></span></div></div>
              <ArrowRight className="workflow-arrow" />
              <div className="workflow-stage"><span className="workflow-stage-number">02</span><small>STUDENT</small><strong>Submit one response</strong><div className="workflow-stage-ui"><span className="workflow-avatar">AM</span><span>Alex Morgan<br /><small>Submitted</small></span></div></div>
              <ArrowRight className="workflow-arrow" />
              <div className="workflow-stage"><span className="workflow-stage-number">03</span><small>TEACHER</small><strong>Review and return</strong><div className="workflow-stage-ui"><Check /><span>Feedback ready<br /><small>Return to student</small></span></div></div>
            </div>
            <div className="workflow-summary"><span>24 submitted</span><span>8 to review</span><b>16 returned</b></div>
          </div>
        </div>
      </section>

      <section className="student-section" aria-labelledby="student-heading">
        <div className="landing-container student-grid">
          <div className="student-screen" aria-label="Student assignment sequence">
            <div className="student-screen-top"><span>Biology 101</span><b>Next up</b></div>
            <div className="student-task active"><span className="student-icon">1</span><div><b>Read the lab protocol</b><small>Resource · 8 min</small></div><Check /></div>
            <div className="student-task"><span className="student-icon quiz">2</span><div><b>Take the pre-lab quiz</b><small>Quiz · 8 questions</small></div><ArrowRight /></div>
            <div className="student-task"><span className="student-icon feedback">3</span><div><b>Review your feedback</b><small>Submission returned</small></div><MessageCircle /></div>
          </div>
          <div><p className="journey-eyebrow">STUDENT EXPERIENCE</p><h2 id="student-heading">Students always know what to open next.</h2><p className="journey-lead">Assignments, quizzes, resources, and feedback stay connected in the class they already use. Your workflow stays teacher-first; their next action stays visible.</p></div>
        </div>
      </section>

      <section className="ai-section" id="ai-assistant" aria-labelledby="ai-heading">
        <div className="landing-container ai-grid">
          <div><p className="journey-eyebrow">AI ASSISTANT</p><h2 id="ai-heading">The assistant drafts. You decide what gets posted.</h2><p className="journey-lead">Ask for an announcement, quiz, or explanation grounded in your class. UpClass keeps the draft in review until a teacher approves it.</p></div>
          <div className="ai-review-card"><div className="ai-command"><small>Ask UpClass</small><span>Draft an announcement for Thursday&apos;s lab</span></div><div className="ai-draft"><span>Draft announcement</span><strong>Thursday&apos;s lab groups are ready</strong><p>Review the protocol and bring your pre-lab diagram.</p><div className="ai-actions"><span className="ai-edit">Edit draft</span><b><Check className="size-3.5" /> Review before posting</b></div></div></div>
        </div>
      </section>

      <section className="schools-section" id="schools" aria-labelledby="schools-heading">
        <div className="landing-container schools-grid"><div><p className="journey-eyebrow">FOR SCHOOLS</p><h2 id="schools-heading">A dependable workspace for every class in your organization.</h2><p className="journey-lead">Keep class-based permissions, shared resources, offline support, and teacher workflows in one consistent place.</p><Button variant="outline" className="schools-cta" asChild><Link href="/contact">Talk to us <ArrowRight className="size-4" /></Link></Button></div><div className="school-console" aria-label="Organization workspace preview"><div className="school-console-head"><div><span className="artifact-mark">U</span><span><b>Springfield High</b><small>Organization workspace</small></span></div><b>Admin view</b></div><div className="school-console-row"><span>Biology 101</span><small>Teacher + 28 students</small><b>Active</b></div><div className="school-console-row"><span>Shared resources</span><small>Available across classes</small><FileText /></div><div className="school-console-row"><span>Offline support</span><small>Changes sync when reconnected</small><WifiOff /></div></div></div>
      </section>

      <FaqSection />
    </>
  );
}

type FaqItem = { question: string; answer: string };
const faqItems: FaqItem[] = [
  { question: "Is UpClass in beta?", answer: "Yes. UpClass is in active development, and teachers can start using the classroom workspace today." },
  { question: "What can teachers and students do?", answer: "Teachers can manage classes, assignments, quizzes, resources, messages, whiteboards, and submissions. Students use the same class to open work and submit responses." },
  { question: "Does AI post for me?", answer: "No. The assistant drafts content, and a teacher reviews and approves it before anything is posted." },
  { question: "How does offline support work?", answer: "UpClass can keep selected classroom work available while a connection is interrupted and sync changes when you are back online." },
  { question: "Can we use our own resources?", answer: "Yes. Add notes, slides, readings, and documents to a resource library and link them to a class." },
  { question: "How do we get support?", answer: "Email support@upclass.xyz or talk to us about bringing UpClass to your school." },
];

export function FaqSection() {
  return <section className="faq-section" id="faq" aria-labelledby="faq-heading"><div className="landing-container faq-intro"><p className="journey-eyebrow">FAQ</p><h2 id="faq-heading">Clear answers before you start.</h2><p>What teachers and schools usually want to know about the UpClass beta.</p></div><Accordion type="single" collapsible defaultValue="faq-0" className="landing-container faq-list">{faqItems.map((item, index) => <AccordionItem value={`faq-${index}`} key={item.question} className="faq-item"><AccordionTrigger className="faq-trigger"><span className="faq-number">0{index + 1}</span><span>{item.question}</span></AccordionTrigger><AccordionContent className="faq-content"><p>{item.answer}</p></AccordionContent></AccordionItem>)}</Accordion></section>;
}
