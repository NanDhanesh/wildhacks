"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

interface DashboardData {
  timer: number
  checklist: string[]
}



export default function DashboardPage() {
  const searchParams = useSearchParams()
  const resultRaw = searchParams.get("result")

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [checklistState, setChecklistState] = useState<boolean[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const [sessionSummary, setSessionSummary] = useState<{ productive: number; unproductive: number } | null>(null)

  useEffect(() => {
    if (resultRaw) {
      try {
        const jsonString = resultRaw.replace(/```json|```/g, "").trim()
        const parsed: DashboardData = JSON.parse(jsonString)
        setDashboard(parsed)
        setCountdown(parsed.timer * 60)
        setChecklistState(new Array(parsed.checklist.length).fill(false))
      } catch (err) {
        console.error("Failed to parse dashboard result:", err)
      }
    }
  }, [resultRaw])

  useEffect(() => {
    if (!isRunning || isPaused || countdown <= 0) return

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, isPaused, countdown])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const toggleChecklistItem = (index: number) => {
    setChecklistState((prev) => {
      const updated = [...prev]
      updated[index] = !updated[index]
      return updated
    })
  }

  //---------------------------------------------------------------//

  useEffect(() => {
    if (!isRunning || isPaused) return
  
    const interval = setInterval(() => {
      fetch("http://localhost:5001/vision/step", {
        method: "POST",
      }).catch((err) => {
        console.error("Failed to step vision:", err)
      })
    }, 1000) // every 1 second
  
    return () => clearInterval(interval)
  }, [isRunning, isPaused])

  const handleStart = async () => {
    try {
      const response = await fetch("http://localhost:5001/domains", {
        method: "DELETE",
      })

      const response2 = await fetch("http://localhost:5001/vision/start", {
        method: "POST",
      })
  
      const result = await response.json()
      const result2 = await response2.json()

      setIsRunning(true)
      setIsPaused(false)
      // if (result.status === "ok") {
      //   setIsRunning(true)
      //   setIsPaused(false)
      // } else {
      //   alert("Failed to start session: Server returned an error.")
      // }
    } catch (err) {
      console.error("Error connecting to Flask server:", err)
      alert("Failed to start session: Could not reach local server.")
    }
  }

  // const handleStart = () => {
  //   fetch("http://127.0.0.1:5001/track", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ url: tab.url })
  //     })
  //     .then(response => response.json())
  //     .then(data => console.log("Server response:", data))
  //     .catch(err => console.error("Failed to send URL:", err));
  // }

  const handlePauseResume = () => {
    if (!isRunning) return
    setIsPaused((prev) => !prev)
  }

  // const handleEnd = () => {
  //   setIsRunning(false)
  //   setIsPaused(false)
  //   setCountdown(0)
  // }

  const handleEnd = async () => {
    try {
      const response = await fetch("http://localhost:5001/domains/analyze", {
        method: "GET",
      })

      const response2 = await fetch("http://localhost:5001/vision/stop", {
        method: "POST",
      })
  
      const result = await response.json()
      const result2 = await response2.json()

      setIsRunning(false)
      setIsPaused(false)
      setCountdown(0)
      if (result.status === "ok") {
        setSessionSummary({
          productive: result.productive,
          unproductive: result.unproductive,
        })
        alert(`🧠 Focus Score: ${result2.focus_score}`)
      }
      // if (result.status === "ok") {
      //   setIsRunning(true)
      //   setIsPaused(false)
      // } else {
      //   alert("Failed to start session: Server returned an error.")
      // }
    } catch (err) {
      console.error("Error connecting to Flask server:", err)
      alert("Failed to start session: Could not reach local server.")
    }
  }

  //---------------------------------------------------------------//

  // const handleEnd = async () => {
  //   try {
  //     const response = await fetch("http://localhost:5001/vision/stop", {
  //       method: "GET",
  //     })
  
  //     const result = await response.json()
  
  //     setIsRunning(false)
  //     setIsPaused(false)
  //     setCountdown(0)
  
  //     if (result.status === "ok") {
  //       alert(`🧠 Focus Score: ${result.focus_score}`)
  //     }
  //   } catch (err) {
  //     console.error("Error connecting to Flask server:", err)
  //     alert("Failed to end session: Could not reach local server.")
  //   }
  // }

  if (!dashboard) {
    return <p style={{ padding: "2rem" }}>Loading dashboard...</p>
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        color: "#111",
        minHeight: "100vh",
        padding: "2rem",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>🎯 Your Study Dashboard</h1>

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem" }}>⏱ Focus Timer</h2>
        <div
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginTop: "0.5rem",
            color: countdown <= 60 && isRunning ? "red" : "black",
          }}
        >
          {formatTime(countdown)}
        </div>

        <div style={{ marginTop: "1rem", display: "flex", gap: "12px" }}>
          {!isRunning && (
            <button onClick={handleStart} style={buttonStyle}>
              ▶️ Start
            </button>
          )}
          {isRunning && (
            <button onClick={handlePauseResume} style={buttonStyle}>
              {isPaused ? "⏯ Resume" : "⏸ Pause"}
            </button>
          )}
          <button onClick={handleEnd} style={buttonStyle}>
            🛑 End
          </button>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>✅ Checklist</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {dashboard.checklist.map((item, index) => (
            <li key={index} style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={checklistState[index]}
                onChange={() => toggleChecklistItem(index)}
                style={{ marginRight: "10px" }}
              />
              <span style={{ textDecoration: checklistState[index] ? "line-through" : "none" }}>{item}</span>
            </li>
          ))}
          {sessionSummary && (
  <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
    <h3>📊 Session Summary</h3>
    <p>✅ Productive Visits: {sessionSummary.productive} visits</p>
    <p>🚫 Unproductive Visits: {sessionSummary.unproductive} visits</p>
  </div>
)}

        </ul>
      </div>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#3498db",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "1rem",
}
