import "server-only";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { PDF_FONT_FAMILY, registerPdfFont } from "./fonts";
import type { HandoverPdfData, HandoverPdfItem } from "./mapper";

registerPdfFont();

const styles = StyleSheet.create({
  page: { fontFamily: PDF_FONT_FAMILY, fontSize: 10, padding: 40, color: "#1c1917" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#57534e", marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  summaryRow: { flexDirection: "row", gap: 16, marginBottom: 4 },
  summaryItem: { fontSize: 10, color: "#57534e" },
  note: { fontSize: 10, lineHeight: 1.5 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d6d3d1",
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    paddingVertical: 4,
  },
  headCellTag: { width: 60, fontSize: 9, fontWeight: "bold" },
  headCellTitle: { flex: 1, fontSize: 9, fontWeight: "bold" },
  headCellStatus: { width: 60, fontSize: 9, fontWeight: "bold" },
  headCellDate: { width: 70, fontSize: 9, fontWeight: "bold" },
  cellTag: { width: 60, fontSize: 9 },
  cellTitle: { flex: 1, fontSize: 9 },
  cellStatus: { width: 60, fontSize: 9 },
  cellDate: { width: 70, fontSize: 9 },
  groupTitle: { fontSize: 10, fontWeight: "bold", marginTop: 8, marginBottom: 4 },
  cardTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 2 },
  cardContent: { fontSize: 9, color: "#44403c", marginBottom: 8, lineHeight: 1.4 },
  insightItem: { fontSize: 9, marginBottom: 3 },
  meetingRow: { marginBottom: 8 },
  meetingDate: { fontSize: 9, fontWeight: "bold" },
  meetingBody: { fontSize: 9, color: "#44403c", marginTop: 2, lineHeight: 1.4 },
});

const STATUS_LABEL: Record<string, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행중",
  DONE: "완료",
};

function ItemTable({ items }: { items: HandoverPdfItem[] }) {
  return (
    <View>
      <View style={styles.tableHead}>
        <Text style={styles.headCellTag}>프로젝트</Text>
        <Text style={styles.headCellTitle}>액션</Text>
        <Text style={styles.headCellStatus}>상태</Text>
        <Text style={styles.headCellDate}>마감</Text>
      </View>
      {items.map((item, index) => (
        <View key={`${item.title}-${index}`} style={styles.tableRow}>
          <Text style={styles.cellTag}>{item.projectTag}</Text>
          <Text style={styles.cellTitle}>{item.title}</Text>
          <Text style={styles.cellStatus}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          <Text style={styles.cellDate}>{item.deadline ?? "-"}</Text>
        </View>
      ))}
    </View>
  );
}

interface HandoverPdfDocumentProps {
  data: HandoverPdfData;
}

/**
 * 인수인계서 PDF — `HandoverPdfData`(package+insights 합본) 하나를 받아 한 장으로 그린다.
 * ⚠️ **화면 셋(팀장 중간승인·오너 최종승인·팀장 귀속)이 같은 문서를 쓴다** — 인계 내용은
 *    단계와 무관하게 같은 물건이라 문서를 셋으로 나눌 이유가 없다.
 */
export function HandoverPdfDocument({ data }: HandoverPdfDocumentProps) {
  const {
    teamNameSnap,
    writerName,
    writerPosition,
    lastWorkingDay,
    note,
    gapSummary,
    items,
    contextCards,
    meetings,
    reassigneeGroups,
    insights,
  } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>
          {writerName} {teamNameSnap} 인수인계서
        </Text>
        <Text style={styles.subtitle}>
          {writerPosition} · 마지막 근무일 {lastWorkingDay ?? "-"}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>인계 요약</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>전체 {gapSummary.totalItems}건</Text>
            <Text style={styles.summaryItem}>미완료 {gapSummary.incompleteCount}건</Text>
            <Text style={styles.summaryItem}>마감 임박 {gapSummary.dueSoonCount}건</Text>
          </View>
          {note && <Text style={styles.note}>{note}</Text>}
        </View>

        {reassigneeGroups.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>담당자별 인계 액션</Text>
            {reassigneeGroups.map((group) => (
              <View key={group.reassigneeName}>
                <Text style={styles.groupTitle}>{group.reassigneeName}</Text>
                <ItemTable items={group.items} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>인계 액션 목록</Text>
            <ItemTable items={items} />
          </View>
        )}

        {contextCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>액션별 맥락</Text>
            {contextCards.map((card, index) => (
              <View key={`${card.title}-${index}`}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardContent}>{card.content}</Text>
              </View>
            ))}
          </View>
        )}

        {meetings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>관련 회의 이력</Text>
            {meetings.map((meeting, index) => (
              <View key={`${meeting.date}-${index}`} style={styles.meetingRow}>
                <Text style={styles.meetingDate}>
                  {meeting.date} · {meeting.attendees.join(", ")}
                </Text>
                {meeting.decisionSummary && (
                  <Text style={styles.meetingBody}>결정: {meeting.decisionSummary}</Text>
                )}
                {meeting.actionItemsSummary && (
                  <Text style={styles.meetingBody}>액션: {meeting.actionItemsSummary}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {(insights.ownership.length > 0 ||
          insights.orphanAlert.length > 0 ||
          insights.askWhom.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>인계 인사이트</Text>
            {insights.ownership.map((text, index) => (
              <Text key={`ownership-${index}`} style={styles.insightItem}>
                · {text}
              </Text>
            ))}
            {insights.orphanAlert.map((text, index) => (
              <Text key={`orphan-${index}`} style={styles.insightItem}>
                주의: {text}
              </Text>
            ))}
            {insights.askWhom.map((text, index) => (
              <Text key={`ask-${index}`} style={styles.insightItem}>
                ? {text}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
