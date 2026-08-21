import {
  AssistantIllustration,
  QuizzesIllustration,
} from "@/components/landing/studio-illustrations";
import {
  ClassworkPreview,
  ResourcePreview,
  WhiteboardPreview,
} from "@/components/landing/studio-previews";

export function StudioFeatures() {
  return (
    <section
      className="studio-section"
      id="features"
      aria-labelledby="studio-heading"
    >
      <div className="landing-container">
        <header className="studio-intro">
          <h2 id="studio-heading">
            Everything your class needs to keep moving.
          </h2>
          <p>
            Plan the work, collect student submissions, answer questions, and
            keep the materials for each class close at hand.
          </p>
        </header>

        <div className="studio-grid">
          <article className="studio-card">
            <div className="studio-copy">
              <h3>Classwork and submissions</h3>
              <p>
                Post assignments with the right materials, see who has
                submitted, and grade each response without leaving the class.
              </p>
            </div>
            <ClassworkPreview />
          </article>

          <article className="studio-card">
            <div className="studio-copy">
              <h3>Collaborative whiteboards</h3>
              <p>
                Sketch ideas with students on a live shared board, then return
                to the saved work in the same class workspace.
              </p>
            </div>
            <WhiteboardPreview />
          </article>

          <article className="studio-card studio-card-wide studio-ai-preview">
            <div className="studio-copy">
              <h3>AI assistance you approve</h3>
              <p>
                Ask about a class, deadline, or file, then review a drafted
                announcement, assignment, or quiz before anything reaches
                students.
              </p>
              <span className="studio-chip">CTRL + J</span>
            </div>
            <AssistantIllustration />
          </article>

          <article className="studio-card">
            <div className="studio-copy">
              <h3>Quiz creation and grading</h3>
              <p>
                Build quizzes yourself or generate questions from a document,
                publish when ready, and review attempts in the gradebook.
              </p>
            </div>
            <QuizzesIllustration />
          </article>

          <article className="studio-card">
            <div className="studio-copy">
              <h3>Resources and document Q&amp;A</h3>
              <p>
                Keep notes, slides, and readings in one library, link them to a
                class, and ask focused questions about an uploaded document.
              </p>
            </div>
            <ResourcePreview />
          </article>
        </div>
      </div>
    </section>
  );
}
