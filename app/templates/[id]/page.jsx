'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppFrame from '@/components/AppFrame';
import BackButton from '@/components/BackButton';
import { api } from '@/lib/api';

function SectionEditor({ section, onChanged }) {
  const [name, setName] = useState(section.name);
  const [newQuestion, setNewQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveName() {
    if (name === section.name) return;
    await api.updateSection(section.id, { name });
    onChanged();
  }

  async function removeSection() {
    if (!confirm(`Delete section "${section.name}" and all its questions? This only affects future audits.`)) return;
    await api.deleteSection(section.id);
    onChanged();
  }

  async function addQuestion() {
    if (!newQuestion.trim()) return;
    setBusy(true);
    try {
      await api.addQuestion(section.id, { text: newQuestion });
      setNewQuestion('');
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(id) {
    await api.deleteQuestion(id);
    onChanged();
  }

  async function editQuestionText(q, text) {
    if (text === q.text) return;
    await api.updateQuestion(q.id, { text });
    onChanged();
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} style={{ flex: 1, fontWeight: 600 }} />
        <button className="danger-ghost small" onClick={removeSection}>Delete section</button>
      </div>

      <div style={{ marginTop: 10 }}>
        {section.questions.filter((q) => q.is_active).map((q) => (
          <QuestionEditRow key={q.id} question={q} onSave={(text) => editQuestionText(q, text)} onDelete={() => removeQuestion(q.id)} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input type="text" placeholder="New question..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} style={{ flex: 1 }} />
        <button className="ghost small" onClick={addQuestion} disabled={busy}>Add question</button>
      </div>
    </div>
  );
}

function QuestionEditRow({ question, onSave, onDelete }) {
  const [text, setText] = useState(question.text);
  return (
    <div className="inline-edit-row">
      <input type="text" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onSave(text)} />
      <button className="danger-ghost small" onClick={onDelete}>Remove</button>
    </div>
  );
}

function TemplateEditorContent({ templateId }) {
  const [template, setTemplate] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');
  const router = useRouter();

  async function refresh() {
    setTemplate(await api.getTemplate(templateId));
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [templateId]);

  async function addSection() {
    if (!newSectionName.trim()) return;
    await api.addSection(templateId, { name: newSectionName });
    setNewSectionName('');
    await refresh();
  }

  async function deactivate() {
    if (!confirm('Deactivate this template? It will no longer be available to start new audits, but past audits are unaffected.')) return;
    await api.deleteTemplate(templateId);
    router.push('/templates');
  }

  if (!template) return <div className="card">Loading...</div>;

  return (
    <div>
      <BackButton fallbackHref="/templates" />
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1>{template.name}</h1>
          <button className="danger-ghost small" onClick={deactivate}>Deactivate template</button>
        </div>
      </div>

      {template.sections.map((s) => (
        <SectionEditor key={s.id} section={s} onChanged={refresh} />
      ))}

      <div className="card">
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="New section name (e.g. Front of Store)" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} style={{ flex: 1 }} />
          <button className="primary" onClick={addSection}>Add section</button>
        </div>
      </div>
    </div>
  );
}

export default function TemplateEditorPage({ params }) {
  return <AppFrame adminOnly>{() => <TemplateEditorContent templateId={params.id} />}</AppFrame>;
}
