import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, User, Bot, Activity, LogOut, Sparkles, ArrowLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"

export default function Home() {
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [currentMessage, setCurrentMessage] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const startSession = async () => {
    if (!linkedinUrl) {
      setError("Please enter a LinkedIn profile URL.")
      return
    }

    setError(null)
    setMessages([])
    setIsTyping(true)

    try {
      const response = await fetch("/api/start-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkedinUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start session")
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "bot", content: data.message }])

      // Simulate bot response
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessages((prev) => [...prev, { role: "bot", content: "What would you like to know about your career path?" }])

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsTyping(false)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isTyping) {
      return
    }

    const userMessage = currentMessage
    setCurrentMessage("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsTyping(true)

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send message")
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "bot", content: data.message }])

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="min-h-screen bg-learntube-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-card">
          <CardHeader className="text-center space-y-6 pb-8">
            <h1 className="text-4xl font-bold text-card-foreground">
              <span className="text-primary">Learn</span>Tube
            </h1>
            <p className="text-lg text-card-foreground/80">
              Connect with your LinkedIn profile to get personalized career insights.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            <div className="space-y-3">
              <label htmlFor="linkedin" className="text-sm font-semibold text-card-foreground block">
                LinkedIn Profile URL
              </label>
              <input
                id="linkedin"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkedinUrl(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && startSession()}
                className="h-12 text-base bg-input border-2 border-border focus:border-primary transition-colors text-card-foreground placeholder:text-muted-foreground w-full rounded-md px-3"
              />
            </div>
            <Button
              onClick={startSession}
              className="w-full"
              disabled={isTyping || !linkedinUrl}
            >
              {isTyping ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isTyping ? "Connecting..." : "Start Session"}
            </Button>
            {error && (
              <p className="text-sm text-red-500 text-center mt-4">{error}</p>
            )}
          </CardContent>
        </Card>

        <footer className="p-4 border-t bg-card/50 backdrop-blur-sm border-border">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <Textarea
                placeholder="Ask about your career path, skills, or opportunities..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={isTyping}
                className="flex-1 pr-14 bg-input border-2 border-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background text-card-foreground placeholder:text-muted-foreground rounded-full resize-none overflow-y-auto"
                style={{ minHeight: "48px", maxHeight: "200px" }}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = "auto"
                  target.style.height = `${target.scrollHeight}px`
                }}
              />
              <Button
                onClick={sendMessage}
                className="absolute bottom-2 right-2"
                disabled={isTyping || !currentMessage.trim()}
              >
                {isTyping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
