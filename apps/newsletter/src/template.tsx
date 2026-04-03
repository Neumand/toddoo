import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Heading,
} from "@react-email/components";
import type { Activity } from "@toddoo/types";

interface WeeklyDigestProps {
  activities: Activity[];
  weekOf: string;
  siteUrl: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Ongoing";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function WeeklyDigest({ activities, weekOf, siteUrl }: WeeklyDigestProps) {
  return (
    <Html>
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading as="h1" style={logoStyle}>
              Toddoo
            </Heading>
            <Text style={subtitleStyle}>
              Weekly Kids Activities - West Island, Montreal
            </Text>
            <Text style={dateStyle}>Week of {weekOf}</Text>
          </Section>

          <Section>
            <Text style={introStyle}>
              Here are this week's activities for kids in the West Island!
            </Text>
          </Section>

          {activities.map((activity) => (
            <Section key={activity.id} style={cardStyle}>
              <Heading as="h3" style={cardTitleStyle}>
                {activity.title}
              </Heading>

              <Text style={cardMetaStyle}>
                {formatDate(activity.startDate)}
                {activity.borough && ` | ${activity.borough}`}
                {activity.cost && ` | ${activity.cost}`}
              </Text>

              <Text style={cardDescStyle}>
                {activity.description.slice(0, 200)}
                {activity.description.length > 200 ? "..." : ""}
              </Text>

              <Link href={`${siteUrl}/activity/${activity.slug}`} style={linkStyle}>
                View details &rarr;
              </Link>
            </Section>
          ))}

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              <Link href={siteUrl} style={footerLinkStyle}>
                View all activities on Toddoo
              </Link>
            </Text>
            <Text style={footerTextStyle}>
              You're receiving this because you subscribed to Toddoo's weekly
              digest. Helping families find fun activities in Montreal's West
              Island.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f3f4f6",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const containerStyle = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
};

const headerStyle = {
  textAlign: "center" as const,
  padding: "20px 0",
};

const logoStyle = {
  color: "#4f46e5",
  fontSize: "28px",
  margin: "0",
};

const subtitleStyle = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "4px 0 0",
};

const dateStyle = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "4px 0 0",
};

const introStyle = {
  color: "#374151",
  fontSize: "15px",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  border: "1px solid #e5e7eb",
};

const cardTitleStyle = {
  color: "#111827",
  fontSize: "16px",
  margin: "0 0 6px",
};

const cardMetaStyle = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0 0 8px",
};

const cardDescStyle = {
  color: "#4b5563",
  fontSize: "14px",
  margin: "0 0 8px",
  lineHeight: "1.5",
};

const linkStyle = {
  color: "#4f46e5",
  fontSize: "13px",
  fontWeight: 600,
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footerStyle = {
  textAlign: "center" as const,
};

const footerTextStyle = {
  color: "#9ca3af",
  fontSize: "12px",
};

const footerLinkStyle = {
  color: "#6b7280",
};
