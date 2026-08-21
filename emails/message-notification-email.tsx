import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

type MessageNotificationEmailProps = {
  previewText: string
  senderName: string
}

export function MessageNotificationEmail({
  previewText,
  senderName,
}: MessageNotificationEmailProps) {
  const subject = `New message from ${senderName}`

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>{subject}</Heading>
          <Text style={meta}>You have a new direct message in UpClass.</Text>
          <Section style={panel}>
            <Text style={content}>{previewText}</Text>
          </Section>
          <Text style={footer}>Open UpClass to reply.</Text>
        </Container>
      </Body>
    </Html>
  )
}

// Classroom Focus email styling mirrors the product's neutral canvas and semantic type hierarchy.
const body = {
  backgroundColor: "#f7f8fa",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: "24px 0",
}

const container = {
  backgroundColor: "#ffffff", // Pure white card
  border: "1px solid rgba(0, 0, 0, 0.08)", // Ink hairline
  borderRadius: "12px", // Card radius
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
}

const heading = {
  color: "#17202a",
  fontSize: "22px",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: "1.27",
  margin: "0 0 12px",
}

const meta = {
  color: "#53606d",
  fontSize: "14px",
  margin: "0 0 20px",
}

const panel = {
  backgroundColor: "#f1f3f5",
  borderRadius: "8px", // Control radius
  padding: "20px",
}

const content = {
  color: "#17202a",
  fontSize: "15px",
  lineHeight: "1.5",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
}

const footer = {
  color: "#7a8794",
  fontSize: "12px",
  margin: "20px 0 0",
}
