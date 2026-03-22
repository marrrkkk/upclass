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

const body = {
  backgroundColor: "#f8fafc",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
}

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px",
}

const heading = {
  color: "#0f172a",
  fontSize: "24px",
  margin: "0 0 12px",
}

const meta = {
  color: "#475569",
  fontSize: "14px",
  margin: "0 0 20px",
}

const panel = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "20px",
}

const content = {
  color: "#0f172a",
  fontSize: "15px",
  lineHeight: "24px",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
}

const footer = {
  color: "#64748b",
  fontSize: "12px",
  margin: "20px 0 0",
}
