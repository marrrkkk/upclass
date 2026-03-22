import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

import { aiChatSchema } from "@/lib/validation/actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = aiChatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      )
    }

    const { message, resourceContext, conversationHistory } = parsed.data

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Build the system context
    const systemContext = `You are a helpful AI assistant that answers questions about a specific learning resource. 

Resource Context:
- Title: ${resourceContext.title}
- Description: ${resourceContext.description || "No description provided"}
- Category: ${resourceContext.category || "General"}
- File Type: ${resourceContext.fileType}
- File Name: ${resourceContext.fileName}

IMPORTANT: You should ONLY answer questions related to this specific resource. If the user asks about something unrelated to this resource, politely redirect them to ask about the resource instead. Base your answers on the information provided about the resource. If you don't have enough information to answer a question, say so.

Keep your responses concise, helpful, and focused on the resource.`

    // Build conversation history as text
    let conversationText = ""
    for (const msg of conversationHistory) {
      const role = msg.role === "user" ? "User" : "Assistant"
      conversationText += `${role}: ${msg.content}\n\n`
    }

    // Build the full prompt with context and history
    const fullPrompt = conversationText
      ? `${systemContext}\n\nPrevious conversation:\n${conversationText}User: ${message}\n\nAssistant:`
      : `${systemContext}\n\nUser: ${message}\n\nAssistant:`

    // Generate response
    const result = await model.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    return NextResponse.json({ response: text })
  } catch (error: unknown) {
    console.error("Gemini API error:", error)
    const message = error instanceof Error ? error.message : "Failed to get AI response"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
