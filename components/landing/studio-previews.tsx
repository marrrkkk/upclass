import {
  Check,
  FileText,
  FolderOpen,
  MousePointer2,
  PenLine,
  Plus,
  Shapes,
  Sparkles,
  Type,
} from "lucide-react";

export function ClassworkPreview() {
  return (
    <div className="feature-window feature-classwork" aria-label="Classwork and submissions preview">
      <div className="feature-window-bar"><b>Biology 101</b><span>Classwork</span></div>
      <div className="feature-tabs"><b>Assignments</b><span>Quizzes</span><span>Grades</span></div>
      <div className="feature-assignment-head"><div><small>DUE TOMORROW</small><strong>Cell diagram assignment</strong></div><span>24 / 28</span></div>
      <div className="feature-progress"><i /></div>
      <div className="feature-submission"><span>AM</span><div><b>Alex Morgan</b><small>Submitted 9:12 AM</small></div><Check /></div>
      <div className="feature-submission"><span>JR</span><div><b>Jamie Rivera</b><small>Submitted 9:26 AM</small></div><Check /></div>
    </div>
  );
}

export function WhiteboardPreview() {
  return (
    <div className="feature-window feature-whiteboard" aria-label="Collaborative whiteboard preview">
      <div className="feature-window-bar"><b>Cell structure board</b><span>Saved</span></div>
      <div className="whiteboard-canvas">
        <div className="whiteboard-tools" aria-hidden="true"><MousePointer2 /><PenLine /><Shapes /><Type /><Plus /></div>
        <div className="whiteboard-note note-one"><small>CELL WALL</small><b>Support + shape</b></div>
        <div className="whiteboard-note note-two"><small>NUCLEUS</small><b>Stores DNA</b></div>
        <div className="whiteboard-link" />
        <div className="whiteboard-presence"><span>SP</span><span>AM</span><b>2 editing</b></div>
      </div>
    </div>
  );
}

export function ResourcePreview() {
  return (
    <div className="feature-window feature-resources" aria-label="Resource library and document question preview">
      <div className="feature-window-bar"><b>Resources</b><span>Biology 101</span></div>
      <div className="resource-layout">
        <div className="resource-list">
          <div className="resource-list-title"><FolderOpen /><span>Class library</span></div>
          <div className="resource-file active"><FileText /><span><b>Lab protocol</b><small>PDF · 12 pages</small></span></div>
          <div className="resource-file"><FileText /><span><b>Cell notes</b><small>Document</small></span></div>
          <div className="resource-file"><FileText /><span><b>Review slides</b><small>Presentation</small></span></div>
        </div>
        <div className="resource-answer"><div><Sparkles /><small>ASK THIS DOCUMENT</small></div><strong>What should students bring?</strong><p>A pre-lab diagram and the completed protocol checklist.</p><span>Grounded in Lab protocol</span></div>
      </div>
    </div>
  );
}
