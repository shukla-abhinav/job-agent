import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ResumeResult, ProfileInfo, JobListing } from '../../types';

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  navy:       '#0f172a',
  navyLight:  '#1e293b',
  blue:       '#2563eb',
  blueLight:  '#dbeafe',
  white:      '#ffffff',
  grayDark:   '#1e293b',
  grayMed:    '#64748b',
  grayLight:  '#94a3b8',
  border:     '#e2e8f0',
  accent:     '#3b82f6',
  accentMid:  '#93c5fd',
  bg:         '#f8fafc',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: C.grayDark,
    backgroundColor: C.white,
  },

  // Header band
  header: {
    backgroundColor: C.navy,
    paddingTop: 30,
    paddingBottom: 26,
    paddingLeft: 44,
    paddingRight: 44,
  },
  headerName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    color: C.white,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 0,
  },
  headerMetaItem: {
    fontSize: 8.5,
    color: C.accentMid,
    marginRight: 16,
    marginBottom: 2,
  },
  headerMetaLink: {
    fontSize: 8.5,
    color: C.accentMid,
    marginRight: 16,
    marginBottom: 2,
    textDecoration: 'none',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginTop: 12,
  },
  tailoredFor: {
    marginTop: 8,
    fontSize: 7.5,
    color: '#64748b',
    fontFamily: 'Helvetica-Oblique',
  },

  // Body
  body: {
    paddingTop: 26,
    paddingLeft: 44,
    paddingRight: 44,
    paddingBottom: 36,
  },

  // Section
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: C.blue,
    letterSpacing: 1.6,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Summary
  summaryText: {
    fontSize: 9.5,
    lineHeight: 1.55,
    color: C.grayDark,
  },

  // Skills — flowing chip-like
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillChip: {
    backgroundColor: C.blueLight,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 7,
    paddingRight: 7,
    borderRadius: 3,
    marginRight: 5,
    marginBottom: 5,
  },
  skillChipText: {
    fontSize: 8.5,
    color: C.blue,
    fontFamily: 'Helvetica-Bold',
  },

  // Experience
  expItem: {
    marginBottom: 12,
  },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  expTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: C.navy,
    flex: 1,
  },
  expPeriod: {
    fontSize: 8.5,
    color: C.grayMed,
    fontFamily: 'Helvetica-Oblique',
  },
  expCompany: {
    fontSize: 9,
    color: C.grayMed,
    marginBottom: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 9.5,
    color: C.blue,
    fontFamily: 'Helvetica-Bold',
    marginTop: 0.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: C.grayDark,
  },

  // Project
  projItem: {
    marginBottom: 10,
  },
  projName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: C.navy,
    marginBottom: 1,
  },
  projTech: {
    fontSize: 8.5,
    color: C.blue,
    marginBottom: 3,
    fontFamily: 'Helvetica-Oblique',
  },
  projDesc: {
    fontSize: 9.5,
    lineHeight: 1.45,
    color: C.grayDark,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7.5,
    color: C.grayLight,
  },
  footerPage: {
    fontSize: 7.5,
    color: C.grayLight,
  },
});

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={S.sectionLabel}>{label.toUpperCase()}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={S.bulletRow}>
      <Text style={S.bulletDot}>›</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  );
}

function ContactSep() {
  return <Text style={{ ...S.headerMetaItem, color: '#475569', marginRight: 8 }}>{'  |  '}</Text>;
}

// ─── Main Document ────────────────────────────────────────────────────────────

interface ResumeDocumentProps {
  resume: ResumeResult;
  profile: ProfileInfo;
  job: JobListing;
}

export function ResumeDocument({ resume, profile, job }: ResumeDocumentProps) {
  const hasLinks = profile.linkedin || profile.github || profile.portfolio;

  return (
    <Document
      title={`Resume — ${profile.name} — ${job.title}`}
      author={profile.name}
      subject={`Tailored resume for ${job.title} at ${job.company}`}
    >
      <Page size="A4" style={S.page}>

        {/* ─── Header ─────────────────────────────────────────── */}
        <View style={S.header}>
          <Text style={S.headerName}>{profile.name || 'Your Name'}</Text>

          {/* Contact row */}
          <View style={S.headerMeta}>
            {profile.location && <Text style={S.headerMetaItem}>{profile.location}</Text>}
            {profile.location && profile.email && <ContactSep />}
            {profile.email && <Text style={S.headerMetaItem}>{profile.email}</Text>}
            {profile.phone && <ContactSep />}
            {profile.phone && <Text style={S.headerMetaItem}>{profile.phone}</Text>}
          </View>

          {/* Links row */}
          {hasLinks && (
            <View style={S.headerMeta}>
              {profile.linkedin && (
                <Link src={profile.linkedin} style={S.headerMetaLink}>
                  {profile.linkedin.replace('https://', '').replace('www.', '')}
                </Link>
              )}
              {profile.linkedin && profile.github && <ContactSep />}
              {profile.github && (
                <Link src={profile.github} style={S.headerMetaLink}>
                  {profile.github.replace('https://', '').replace('www.', '')}
                </Link>
              )}
              {profile.portfolio && (
                <>
                  <ContactSep />
                  <Link src={profile.portfolio} style={S.headerMetaLink}>
                    {profile.portfolio.replace('https://', '').replace('www.', '')}
                  </Link>
                </>
              )}
            </View>
          )}

          <View style={S.headerDivider} />
          <Text style={S.tailoredFor}>
            Tailored for: {job.title} at {job.company}
          </Text>
        </View>

        {/* ─── Body ───────────────────────────────────────────── */}
        <View style={S.body}>

          {/* Professional Summary */}
          {resume.summary && (
            <View style={S.section}>
              <SectionHeader label="Professional Summary" />
              <Text style={S.summaryText}>{resume.summary}</Text>
            </View>
          )}

          {/* Skills */}
          {resume.skills.length > 0 && (
            <View style={S.section}>
              <SectionHeader label="Core Skills" />
              <View style={S.skillsRow}>
                {resume.skills.map((skill, i) => (
                  <View key={i} style={S.skillChip}>
                    <Text style={S.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <View style={S.section}>
              <SectionHeader label="Experience" />
              {resume.experience.map((exp, i) => (
                <View key={i} style={S.expItem}>
                  <View style={S.expHeaderRow}>
                    <Text style={S.expTitle}>{exp.title}</Text>
                    <Text style={S.expPeriod}>{exp.period}</Text>
                  </View>
                  <Text style={S.expCompany}>{exp.company}</Text>
                  {exp.bullets.map((bullet, j) => (
                    <Bullet key={j} text={bullet} />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Projects */}
          {resume.projects.length > 0 && (
            <View style={S.section}>
              <SectionHeader label="Projects" />
              {resume.projects.map((proj, i) => (
                <View key={i} style={S.projItem}>
                  <Text style={S.projName}>{proj.name}</Text>
                  <Text style={S.projTech}>{proj.tech.join('  ·  ')}</Text>
                  <Text style={S.projDesc}>{proj.description}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>AI Job Matcher — Generated resume · Based on profile.md</Text>
          <Text
            style={S.footerPage}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  );
}
