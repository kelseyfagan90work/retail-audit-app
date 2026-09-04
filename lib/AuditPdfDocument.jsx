import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#555555', marginBottom: 12 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    borderBottomStyle: 'solid',
  },
  metaCol: { flexDirection: 'column' },
  metaLabel: { fontSize: 8, color: '#888888', textTransform: 'uppercase', marginBottom: 1 },
  metaValue: { fontSize: 10, marginBottom: 6 },
  scoreBox: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
    borderBottomStyle: 'solid',
  },
  question: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: '#eeeeee', borderBottomStyle: 'solid' },
  questionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  questionText: { fontSize: 10, flexGrow: 1, marginRight: 8 },
  answer: { fontSize: 10, fontFamily: 'Helvetica-Bold', width: 50, textAlign: 'right' },
  note: { fontSize: 9, color: '#555555', marginTop: 4 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  photo: { width: 90, height: 90, objectFit: 'cover', marginRight: 6, marginBottom: 6 },
  overallNote: { marginTop: 16, padding: 10, backgroundColor: '#f6f6f6' },
  overallNoteTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 4 },
});

function answerLabel(a) {
  if (a === 'yes') return 'YES';
  if (a === 'no') return 'NO';
  if (a === 'n_a') return 'N/A';
  return '—';
}

function answerColor(a) {
  if (a === 'yes') return '#1d7a3c';
  if (a === 'no') return '#b23a34';
  return '#888888';
}

export default function AuditPdfDocument({ audit }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{audit.stores.store_name}</Text>
        <Text style={styles.subtitle}>
          {audit.template_name}{audit.stores.region ? ` · ${audit.stores.region}` : ''}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Auditor</Text>
            <Text style={styles.metaValue}>{audit.auditor_name || audit.auditor_email}</Text>
            <Text style={styles.metaLabel}>Audit month</Text>
            <Text style={styles.metaValue}>{audit.audit_period ? audit.audit_period.slice(0, 7) : '—'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Started</Text>
            <Text style={styles.metaValue}>{new Date(audit.started_at).toLocaleString()}</Text>
            <Text style={styles.metaLabel}>Completed</Text>
            <Text style={styles.metaValue}>{audit.completed_at ? new Date(audit.completed_at).toLocaleString() : '—'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Announced</Text>
            <Text style={styles.metaValue}>{audit.announced === true ? 'Announced' : audit.announced === false ? 'Unannounced' : '—'}</Text>
            <Text style={styles.metaLabel}>Manager on shift</Text>
            <Text style={styles.metaValue}>{audit.manager_on_shift || '—'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Overall score</Text>
            <Text style={styles.scoreBox}>{audit.overall_score != null ? `${audit.overall_score}%` : '—'}</Text>
          </View>
        </View>

        {audit.sections.map((section) => (
          <View key={section.id}>
            <Text style={styles.sectionTitle}>{section.name}</Text>
            {section.questions.map((q) => (
              <View key={q.id} style={styles.question} wrap={false}>
                <View style={styles.questionRow}>
                  <Text style={styles.questionText}>{q.text}</Text>
                  <Text style={[styles.answer, { color: answerColor(q.answer) }]}>{answerLabel(q.answer)}</Text>
                </View>
                {q.note ? <Text style={styles.note}>Note: {q.note}</Text> : null}
                {q.photos && q.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {q.photos.map((p) => (
                      <Image key={p.id} src={p.url} style={styles.photo} />
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {audit.overall_note ? (
          <View style={styles.overallNote}>
            <Text style={styles.overallNoteTitle}>Overall notes</Text>
            <Text>{audit.overall_note}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
