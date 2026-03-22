import { createElement, type ReactElement } from "react"
import { Resend } from "resend"

import { db } from "@/db"
import { notifications } from "@/db/schema"
import { ClassNotificationEmail } from "@/emails/class-notification-email"
import { MessageNotificationEmail } from "@/emails/message-notification-email"

type DeliveryChannel = "email" | "push"

type NotificationRecipient = {
  userId: string
  email: string
  emailNotifications: boolean
  pushNotifications: boolean
}

type ClassNotificationRecipient = NotificationRecipient & {
  classNotifications: boolean
}

type EmailPayload = {
  email: string
  react: ReactElement
  subject: string
}

type NoopProviderResult = {
  delivered: false
  reason: string
}

interface OutboundNotificationProvider<Payload> {
  channel: DeliveryChannel
  send(payload: Payload): Promise<NoopProviderResult | { delivered: true }>
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function getEmailFrom() {
  return process.env.EMAIL_FROM || "UpClass <notifications@upclass.xyz>"
}

class ResendEmailProvider implements OutboundNotificationProvider<EmailPayload> {
  channel: DeliveryChannel = "email"

  async send(payload: EmailPayload): Promise<NoopProviderResult | { delivered: true }> {
    const resend = getResendClient()
    if (!resend) {
      console.info("Email notification skipped: RESEND_API_KEY not configured")
      return { delivered: false, reason: "RESEND_API_KEY not configured" }
    }

    try {
      const result = await resend.emails.send({
        from: getEmailFrom(),
        to: [payload.email],
        subject: payload.subject,
        react: payload.react,
      })

      if (result.error) {
        console.error("Resend email send failed", result.error)
        return { delivered: false, reason: result.error.message }
      }

      return { delivered: true }
    } catch (error) {
      console.error("Resend email send threw", error)
      return { delivered: false, reason: "email send failed" }
    }
  }
}

class NoopPushProvider implements OutboundNotificationProvider<{
  recipientId: string
  title: string
}> {
  channel: DeliveryChannel = "push"

  async send(payload: { recipientId: string; title: string }): Promise<NoopProviderResult> {
    console.info("Push notification skipped: provider not configured", payload)
    return { delivered: false, reason: "push provider not configured" }
  }
}

const emailProvider = new ResendEmailProvider()
const pushProvider = new NoopPushProvider()

async function deliverOptionalChannels(
  recipient: NotificationRecipient,
  payload: {
    emailSubject: string
    emailReact: ReactElement
    pushTitle: string
  },
) {
  if (recipient.emailNotifications) {
    await emailProvider.send({
      email: recipient.email,
      subject: payload.emailSubject,
      react: payload.emailReact,
    })
  }

  if (recipient.pushNotifications) {
    await pushProvider.send({
      recipientId: recipient.userId,
      title: payload.pushTitle,
    })
  }
}

export async function deliverClassNotifications(args: {
  recipients: ClassNotificationRecipient[]
  type: "announcement" | "classwork"
  title: string
  message: string
  classId: string
  classTitle?: string | null
  relatedId: string
}) {
  const recipients = args.recipients.filter((recipient) => recipient.classNotifications)
  if (recipients.length === 0) return

  await db.insert(notifications).values(
    recipients.map((recipient) => ({
      id: crypto.randomUUID(),
      userId: recipient.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      classId: args.classId,
      relatedId: args.relatedId,
      read: false,
    })),
  )

  await Promise.all(
    recipients.map((recipient) =>
      deliverOptionalChannels(recipient, {
        emailSubject: args.title,
        emailReact: createElement(ClassNotificationEmail, {
          classTitle: args.classTitle,
          message: args.message,
          subject: args.title,
        }),
        pushTitle: args.title,
      }),
    ),
  )
}

export async function deliverMessageNotification(args: {
  recipient: NotificationRecipient & { messageNotifications: boolean }
  senderName: string
  preview: string
}) {
  if (!args.recipient.messageNotifications) return

  const preview = args.preview.length > 80 ? `${args.preview.slice(0, 80)}...` : args.preview
  const subject = `New message from ${args.senderName}`

  await deliverOptionalChannels(args.recipient, {
    emailSubject: subject,
    emailReact: createElement(MessageNotificationEmail, {
      previewText: preview || "Open UpClass to view the message.",
      senderName: args.senderName,
    }),
    pushTitle: preview || subject,
  })
}

export async function sendTestEmail(to: string) {
  const normalized = to.trim()
  if (!normalized) {
    return { success: false as const, error: "Recipient email is required" }
  }

  const result = await emailProvider.send({
    email: normalized,
    subject: "UpClass Resend test email",
    react: createElement(MessageNotificationEmail, {
      senderName: "UpClass",
      previewText:
        "This is a test email from your Resend integration. If you received this, sending is configured correctly.",
    }),
  })

  if (!result.delivered) {
    return { success: false as const, error: result.reason }
  }

  return { success: true as const }
}
