// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";

import LandingPage from "@/app/page";
import {
  AssistantIllustration,
  ClassworkIllustration,
  QuizzesIllustration,
  ResourceIllustration,
  WhiteboardIllustration,
} from "@/components/landing/studio-illustrations";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe("LandingPage", () => {
  it("renders the teacher-focused hero, feature grid, and public actions", async () => {
    const markup = renderToStaticMarkup(await LandingPage());

    expect(markup).toContain("One place");
    expect(markup).toContain("to run your class.");
    expect(markup).toContain("One place<br/><span>to run your class.</span>");
    expect(markup).toContain("classroom LMS");
    expect(markup).toContain("student submissions");
    expect(markup).toContain("UpClass is in active development");
    expect(markup).toContain("UpClass");
    expect(markup).toContain("Features");
    expect(markup).toContain("How it works");
    expect(markup).toContain("AI assistant");
    expect(markup).toContain("For schools");
    expect(markup).toContain("FAQ");
    expect(markup).toContain('href="/sign-up"');
    expect(markup).toContain('href="#features"');
    expect(markup).toContain('href="#workflow"');
    expect(markup).toContain('href="#ai-assistant"');
    expect(markup).toContain('href="#schools"');
    expect(markup).toContain('href="#faq"');
    expect(markup).toContain('aria-label="UpClass classroom LMS preview"');
    expect(markup).toContain("CLASS WORKSPACE");
    expect(markup).toContain("Assignments");
    expect(markup).toContain("24 of 28 submitted");
    expect(markup).toContain("Everything your class needs to keep moving.");
    expect(markup).toContain("Classwork and submissions");
    expect(markup).toContain("Collaborative whiteboards");
    expect(markup).toContain("AI assistance you approve");
    expect(markup).toContain("Quiz creation and grading");
    expect(markup).toContain("Resources and document Q&amp;A");
    expect(markup).toContain("CTRL + J");
    expect(markup).toContain("Plan the work once, then keep the class moving.");
    expect(markup).toContain("Students always know what to open next.");
    expect(markup).toContain("The assistant drafts. You decide what gets posted.");
    expect(markup).toContain("Review before posting");
    expect(markup).toContain("A dependable workspace for every class in your organization.");
    expect(markup).toContain("Is UpClass in beta?");
    expect(markup).toContain("What can teachers and students do?");
    expect(markup).toContain('data-slot="accordion"');
    expect(markup).toContain('data-slot="accordion-trigger"');
    expect(markup).toContain("Bring your teacher workflow");
    expect(markup).toContain("support@upclass.xyz");
    expect(markup).toContain("Privacy Policy");
    expect(markup).toContain("Terms of Service");
    expect(markup).toContain("Support");
    expect(markup).toContain("Back to top");

    expect(markup).not.toContain("THE PARTS THAT MATTER");
    expect(markup).not.toContain("GETTING STARTED");
    expect(markup).not.toContain("Open the door");
    expect(markup).not.toContain("Come back tomorrow");
    expect(markup).not.toContain('href="#why"');
    expect(markup).not.toContain('href="#flow"');
    expect(markup).not.toContain("testimonial");
    expect(markup).not.toContain("customer logos");
    expect(markup).not.toContain("per month");
    expect(markup).not.toContain("robot-mascot");
    expect(markup).not.toContain("mascot");
    expect(markup).not.toMatch(/\d+%/);
  });

  it("keeps interface illustrations free of character eyes", () => {
    const nonAiIllustrations = [
      <ClassworkIllustration key="classwork" />,
      <WhiteboardIllustration key="whiteboard" />,
      <QuizzesIllustration key="quizzes" />,
      <ResourceIllustration key="resources" />,
    ];

    for (const illustration of nonAiIllustrations) {
      expect(renderToStaticMarkup(illustration)).not.toContain(
        'data-ai-eye="true"',
      );
    }

    expect(renderToStaticMarkup(<AssistantIllustration />)).not.toContain(
      'data-ai-eye="true"',
    );
  });
});
