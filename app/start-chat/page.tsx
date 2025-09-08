"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, User, Bot, Activity, LogOut, Sparkles, ArrowLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { useRouter } from "next/navigation"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface MarketInsight {
  title: string
  url: string
}

export default function StartChatPage() {
  const [currentView, setCurrentView] = useState<"input" | "loading" | "chat">("input")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<"healthy" | "error" | "checking">("healthy")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  const startSession = async () => {
    if (!linkedinUrl.trim()) return

    setCurrentView("loading")
    setIsLoading(true)
    try {
      const response = await fetch("/api/start-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedin_url: linkedinUrl }),
      })

      if (response.ok) {
        const data = await response.json()
        setThreadId(data.thread_id)

        const firstMessage: Message = {
          id: Date.now().toString(),
          content:
            data.message ||
            "I've analyzed your LinkedIn profile! Let me help you create a personalized career plan. What specific career goals are you looking to achieve?",
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages([firstMessage])
        setCurrentView("chat")
      }
    } catch (error) {
      console.error("Failed to start session:", error)
      setCurrentView("input")
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || !threadId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const messageToSend = currentMessage
    setCurrentMessage("")
    setIsTyping(true)

    try {
      const response = await fetch("/api/resume-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          message: messageToSend,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const formattedMessages: Message[] = data.chat_history.map((msg: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(),
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsTyping(false)
    }
  }

  const endSession = async () => {
    if (!threadId) return

    try {
      await fetch(`/api/chat/${threadId}`, {
        method: "DELETE",
      })
    } catch (error) {
      console.error("Failed to end session:", error)
    } finally {
      setThreadId(null)
      setMessages([])
      router.push("/")
    }
  }

  const checkHealth = async () => {
    setHealthStatus("checking")
    try {
      const response = await fetch("/api/health")
      setHealthStatus(response.ok ? "healthy" : "error")
    } catch (error) {
      setHealthStatus("error")
    }
  }

  const extractMarketInsights = (content: string): { content: string; insights: MarketInsight[] } => {
    const insightsRegex = /### Market Insights\s*([\s\S]*?)(?=\n###|\n\n|$)/
    const match = content.match(insightsRegex)

    if (!match) return { content, insights: [] }

    const insightsSection = match[1]
    const linkRegex = /\[([^\]]+)\]$$([^)]+)$$/g
    const insights: MarketInsight[] = []
    let linkMatch

    while ((linkMatch = linkRegex.exec(insightsSection)) !== null) {
      insights.push({
        title: linkMatch[1],
        url: linkMatch[2],
      })
    }

    const contentWithoutInsights = content.replace(insightsRegex, "").trim()
    return { content: contentWithoutInsights, insights }
  }

  const TypingIndicator = () => (
    <div className="flex items-start space-x-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center shadow-sm">
        <Bot className="h-4 w-4 text-card-foreground" />
      </div>
      <div className="bg-card rounded-lg p-4 shadow-sm border border-border flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-sm text-secondary-foreground">AI is typing...</span>
      </div>
    </div>
  )

  if (currentView === "loading") {
    return (
      <div className="min-h-screen bg-learntube-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-card">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-card-foreground">Analyzing Your Profile</h2>
                <p className="text-secondary-foreground text-base leading-relaxed">
                  We're scraping your LinkedIn data and preparing your personalized career insights...
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="ml-2">Processing your data</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  This may take a few moments while we gather your professional information
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (currentView === "input") {
    return (
      <div className="min-h-screen bg-learntube-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-card">
            <CardHeader className="text-center space-y-6 pb-8">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="absolute top-4 left-4 text-card-foreground hover:bg-card/80"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="mx-auto w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-card-foreground">Start New Chat</h1>
                <p className="text-secondary-foreground text-lg leading-relaxed">
                  Enter your LinkedIn profile to begin career analysis
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="space-y-3">
                <label htmlFor="linkedin" className="text-sm font-semibold text-card-foreground block">
                  LinkedIn Profile URL
                </label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startSession()}
                  className="h-12 text-base bg-input border-2 border-border focus:border-primary transition-colors text-card-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button
                onClick={startSession}
                disabled={!linkedinUrl.trim() || isLoading}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Analyzing Your Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-3 h-5 w-5" />
                    Start Career Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-learntube-gradient">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Career Assistant</h1>
              <p className="text-sm text-muted-foreground">Personalized career guidance</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              disabled={healthStatus === "checking"}
              className="bg-card border-border text-card-foreground hover:bg-card/80"
            >
              {healthStatus === "checking" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Activity className="mr-2 h-4 w-4" />
              )}
              Health
              <Badge
                variant={healthStatus === "healthy" ? "default" : "destructive"}
                className="ml-2 bg-primary text-primary-foreground"
              >
                {healthStatus === "checking" ? "..." : healthStatus}
              </Badge>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={endSession}
              className="bg-card border-border text-card-foreground hover:bg-destructive/20 hover:border-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              End Session
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => {
              const { content, insights } =
                message.role === "assistant"
                  ? extractMarketInsights(message.content)
                  : { content: message.content, insights: [] }

              return (
                <div key={message.id}>
                  <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex items-start space-x-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-card-foreground"
                        }`}
                      >
                        {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={`rounded-lg p-4 shadow-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-card-foreground border border-border"
                        }`}
                      >
                        <div className="prose prose-sm max-w-none">
                          {message.role === "user" ? (
                            <p className="mb-0 leading-relaxed">{content}</p>
                          ) : (
                            <ReactMarkdown
                              className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="text-lg font-bold mb-2 text-card-foreground">{children}</h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-base font-semibold mb-2 text-card-foreground">{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-sm font-semibold mb-1 text-card-foreground">{children}</h3>
                                ),
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0 leading-relaxed text-secondary-foreground">{children}</p>
                                ),
                                ul: ({ children }) => <ul className="mb-2 last:mb-0 pl-4 space-y-1">{children}</ul>,
                                li: ({ children }) => <li className="text-secondary-foreground">{children}</li>,
                                a: ({ children, href }) => (
                                  <a
                                    href={href}
                                    className="text-primary hover:underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-card-foreground">{children}</strong>
                                ),
                              }}
                            >
                              {content}
                            </ReactMarkdown>
                          )}
                        </div>
                        <div
                          className={`text-xs mt-2 ${message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {insights.length > 0 && (
                    <div className="mt-4 ml-11">
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold text-card-foreground flex items-center">
                            <Activity className="h-4 w-4 mr-2 text-primary" />
                            Market Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {insights.map((insight, index) => (
                              <a
                                key={index}
                                href={insight.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors border border-border hover:border-primary/30"
                              >
                                <span className="text-sm font-medium text-primary hover:underline">
                                  {insight.title}
                                </span>
                              </a>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )
            })}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex space-x-3">
            <Input
              placeholder="Ask about your career path, skills, or opportunities..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={isTyping}
              className="flex-1 h-12 bg-input border-2 border-border focus:border-primary text-card-foreground placeholder:text-muted-foreground"
            />
            <Button
              onClick={sendMessage}
              disabled={!currentMessage.trim() || isTyping}
              className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
