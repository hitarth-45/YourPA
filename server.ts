import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } else {
      console.warn("GEMINI_API_KEY environment variable is not defined. Using fallback rule-based analysis.");
    }
  }
  return aiClient;
}

function getLocalHeuristicForTask(title: string, description: string = "", userPriority?: string) {
  const text = (title + " " + description).toLowerCase();

  // 1. Bills & Recharges (Internet, Jio, Broadband, Electricity, Water, Gas, Mobile, Recharge, Netflix, Spotify, Subscription, Pay bill)
  if (
    text.includes("pay") || 
    text.includes("bill") || 
    text.includes("recharge") || 
    text.includes("jio") || 
    text.includes("fibre") || 
    text.includes("fiber") || 
    text.includes("netflix") || 
    text.includes("spotify") || 
    text.includes("subscription") || 
    text.includes("broadband") || 
    text.includes("electricity") || 
    text.includes("utility") ||
    text.includes("dth")
  ) {
    return {
      priority: "HIGH",
      aiBenchmarkMinutes: 1,
      humanEstimatedMinutes: 3,
      proactiveBufferMinutes: 2,
      category: "bill",
      schedulingAdvice: "Internet, Jio, and utility bills take only 2-3 minutes to process online. Pay immediately to keep your digital pipelines secure and avoid late-penalty panic!",
      subtasks: [
        { title: "Open payment application or banking portal", estimatedMinutes: 1 },
        { title: "Input account details and confirm billing amount", estimatedMinutes: 1 },
        { title: "Complete verification and save receipt confirmation", estimatedMinutes: 1 }
      ]
    };
  }

  // 2. Quick chores/reminders (buy milk, throw trash, water plants, feed pet, clean table)
  if (
    text.includes("milk") || 
    text.includes("grocery") || 
    text.includes("groceries") || 
    text.includes("trash") || 
    text.includes("garbage") || 
    text.includes("water plants") || 
    text.includes("feed") || 
    text.includes("clean") || 
    text.includes("wash") ||
    text.includes("dishes") ||
    text.includes("laundry")
  ) {
    const isLaundryOrHeavyClean = text.includes("laundry") || text.includes("clean room") || text.includes("clean house");
    return {
      priority: userPriority || "MEDIUM",
      aiBenchmarkMinutes: 2,
      humanEstimatedMinutes: isLaundryOrHeavyClean ? 30 : 5,
      proactiveBufferMinutes: isLaundryOrHeavyClean ? 10 : 2,
      category: "chore",
      schedulingAdvice: isLaundryOrHeavyClean 
        ? "A standard physical chore. Breaking it down helps maintain focus and speeds up completion." 
        : "Micro-chore detected. Do it now! Any task taking under 5 minutes should be completed immediately to free up cognitive buffer.",
      subtasks: isLaundryOrHeavyClean ? [
        { title: "Gather items and sort resources", estimatedMinutes: 5 },
        { title: "Execute core cleaning or laundry cycles", estimatedMinutes: 20 },
        { title: "Restore tools and perform final sweep", estimatedMinutes: 5 }
      ] : [
        { title: "Locate tools or move to target area", estimatedMinutes: 2 },
        { title: "Perform micro-chore completely", estimatedMinutes: 3 }
      ]
    };
  }

  // 3. Quick Administrative Communication (email, call, message, sms, whatsapp, calendar invite, slack)
  if (
    text.includes("email") || 
    text.includes("mail") || 
    text.includes("call ") || 
    text.includes("phone") || 
    text.includes("message") || 
    text.includes("sms") || 
    text.includes("whatsapp") || 
    text.includes("slack") || 
    text.includes("ping") ||
    text.includes("text ")
  ) {
    return {
      priority: userPriority || "MEDIUM",
      aiBenchmarkMinutes: 2,
      humanEstimatedMinutes: 8,
      proactiveBufferMinutes: 4,
      category: "administrative",
      schedulingAdvice: "Quick communication check. Keep it focused and brief to prevent falling down a social media scroll spiral. Send the message and move on!",
      subtasks: [
        { title: "Draft core points or open contact application", estimatedMinutes: 2 },
        { title: "Compose and dispatch message/email", estimatedMinutes: 4 },
        { title: "Confirm response state and set reminder", estimatedMinutes: 2 }
      ]
    };
  }

  // 4. Meetings (zoom, teams, meet, sync, discussion, interview)
  if (
    text.includes("meet") || 
    text.includes("zoom") || 
    text.includes("sync") || 
    text.includes("discussion") || 
    text.includes("interview") || 
    text.includes("call with") ||
    text.includes("one-on-one") ||
    text.includes("1:1")
  ) {
    return {
      priority: "HIGH",
      aiBenchmarkMinutes: 5,
      humanEstimatedMinutes: 30,
      proactiveBufferMinutes: 10,
      category: "meeting",
      schedulingAdvice: "Review meeting agenda 5 minutes prior to stay aligned and save sync energy. Ensure mic and connection are checked.",
      subtasks: [
        { title: "Review objective & join channel early", estimatedMinutes: 5 },
        { title: "Active meeting execution & note-taking", estimatedMinutes: 20 },
        { title: "Synthesize immediate follow-up actions", estimatedMinutes: 5 }
      ]
    };
  }

  // 5. Study/Assignment/Exam Prep (exam, test, study, review, homework, assignment, lecture, quiz)
  if (
    text.includes("study") || 
    text.includes("exam") || 
    text.includes("test") || 
    text.includes("review") || 
    text.includes("homework") || 
    text.includes("assignment") || 
    text.includes("lecture") || 
    text.includes("quiz") || 
    text.includes("learn") || 
    text.includes("read chapter")
  ) {
    return {
      priority: "HIGH",
      aiBenchmarkMinutes: 10,
      humanEstimatedMinutes: 120,
      proactiveBufferMinutes: 30,
      category: "study",
      schedulingAdvice: "Deep study or assignment block. We highly recommend utilizing the Interactive Pacing Planner in the console to partition this into active intervals.",
      subtasks: [
        { title: "Organize required syllabus and target key goals", estimatedMinutes: 15 },
        { title: "Deep-focus study phase (Module 1)", estimatedMinutes: 45 },
        { title: "Active break & hydration recovery", estimatedMinutes: 10 },
        { title: "Problem-solving and active recall (Module 2)", estimatedMinutes: 40 },
        { title: "Compile core notes summary", estimatedMinutes: 10 }
      ]
    };
  }

  // Standard fallback
  return {
    priority: userPriority || "MEDIUM",
    aiBenchmarkMinutes: 5,
    humanEstimatedMinutes: 45,
    proactiveBufferMinutes: 15,
    category: "general",
    schedulingAdvice: "Plan systematically and guard your safety buffer against unexpected delays. Starting immediately reduces late-stage panic triggers.",
    subtasks: [
      { title: "Define precise goals and collect resources", estimatedMinutes: 10 },
      { title: "Execute core target segments", estimatedMinutes: 25 },
      { title: "Final check, Polish and wrap-up", estimatedMinutes: 10 }
    ]
  };
}

// 1. Analyze Task Endpoint
app.post("/api/analyze-task", async (req, res) => {
  const { title, description, userPriority, deadline } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Task title is required." });
  }

  // Quick pre-override for high-frequency simple micro-tasks to guarantee extremely accurate data source estimates
  const text = (title + " " + (description || "")).toLowerCase();
  const isQuickBill = text.includes("pay") || text.includes("bill") || text.includes("recharge") || text.includes("jio") || text.includes("fibre") || text.includes("fiber") || text.includes("broadband") || text.includes("electricity") || text.includes("netflix") || text.includes("spotify") || text.includes("subscription") || text.includes("dth");
  const isQuickChore = (text.includes("milk") || text.includes("trash") || text.includes("garbage") || text.includes("water plants") || text.includes("feed")) && !text.includes("laundry") && !text.includes("clean house") && !text.includes("clean room");
  const isQuickAdmin = (text.includes("email") || text.includes("mail") || text.includes("whatsapp") || text.includes("sms") || text.includes("slack") || text.includes("text ")) && !text.includes("essay") && !text.includes("report");

  if (isQuickBill || isQuickChore || isQuickAdmin) {
    const microEstimate = getLocalHeuristicForTask(title, description || "", userPriority);
    return res.json(microEstimate);
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Elegant keyword-aware heuristic fallback when API key is missing
    const fallbackEstimate = getLocalHeuristicForTask(title, description || "", userPriority);
    return res.json({
      ...fallbackEstimate,
      warning: "GEMINI_API_KEY is not configured in Secrets. Using advanced rule-based fallback analysis."
    });
  }

  try {
    const prompt = `Analyze the following task. Predict the time taken by a human to complete it vs. how long an AI tool or automated script might take to do it. Provide an AI priority assessment, category, proactive safety buffer, actionable scheduling plan, and break it down into 3-5 subtasks with human completion timings.
    
    Task Details:
    - Title: "${title}"
    - Description: "${description || 'None provided'}"
    - Deadline: "${deadline || 'No specific date'}"
    - User Selected Priority: "${userPriority || 'MEDIUM'}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert deadline prevention coordinator and productivity diagnostic engine.
        Your goal is to estimate and structure tasks realistically for humans. Humans struggle with planning fallacy—they underestimate completion time.
        
        Rule 1: Est. AI benchmark (aiBenchmarkMinutes) is how long an AI assistant or automatic program takes to generate or complete the job (usually 1 to 10 minutes).
        Rule 2: Est. Human benchmark (humanEstimatedMinutes) is a realistic human completion duration in minutes (can range from 10 to 4800 minutes). Be realistic! Complex assignments or exam preps take hours, simple bills take 5-10 minutes.
        Rule 3: Give direct, highly empathetic scheduling advice that encourages immediate start, stating the exact risks of last-minute panic.
        Rule 4: Create a realistic subtask breakdown where the sum of subtask minutes roughly matches humanEstimatedMinutes.
        Rule 5: Define a dynamic safety buffer (proactiveBufferMinutes) in minutes.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["priority", "aiBenchmarkMinutes", "humanEstimatedMinutes", "proactiveBufferMinutes", "category", "schedulingAdvice", "subtasks"],
          properties: {
            priority: {
              type: Type.STRING,
              description: "The recommended priority. Must be one of: CRITICAL, HIGH, MEDIUM, LOW."
            },
            aiBenchmarkMinutes: {
              type: Type.INTEGER,
              description: "Estimated minutes for an AI or digital script to complete this."
            },
            humanEstimatedMinutes: {
              type: Type.INTEGER,
              description: "Realistic minutes for a human to complete this fully, without cutting corners."
            },
            proactiveBufferMinutes: {
              type: Type.INTEGER,
              description: "Dynamic safety buffer in minutes to handle potential human interruptions or procrastination."
            },
            category: {
              type: Type.STRING,
              description: "Categorize the task. Use one of: bill, study, assignment, meeting, administrative, creative, chore, or general."
            },
            schedulingAdvice: {
              type: Type.STRING,
              description: "Empathetic, clear warnings regarding delaying this task and exactly how to fit it into a schedule."
            },
            subtasks: {
              type: Type.ARRAY,
              description: "Structured list of actionable subtasks that build up to the primary task.",
              items: {
                type: Type.OBJECT,
                required: ["title", "estimatedMinutes"],
                properties: {
                  title: { type: Type.STRING, description: "Actionable name of the subtask." },
                  estimatedMinutes: { type: Type.INTEGER, description: "Human minutes to complete this subtask." }
                }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    return res.status(500).json({
      error: "Failed to perform AI analysis. Using fallback heuristic.",
      fallback: {
        priority: userPriority || "MEDIUM",
        aiBenchmarkMinutes: 5,
        humanEstimatedMinutes: 60,
        proactiveBufferMinutes: 30,
        category: "general",
        schedulingAdvice: "AI analysis server encountered a query limit or parsing issue. Defaulting to standard time estimates. Be mindful of deadlines!",
        subtasks: [
          { title: "Define outline & requirements", estimatedMinutes: 15 },
          { title: "Core production work", estimatedMinutes: 30 },
          { title: "Review and complete", estimatedMinutes: 15 }
        ]
      }
    });
  }
});

// 2. Voice/Dictation Extraction Endpoint
app.post("/api/voice-input", async (req, res) => {
  const { speechText } = req.body;

  if (!speechText) {
    return res.status(400).json({ error: "Speech text is empty." });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Quick heuristic fallback
    return res.json({
      title: speechText.substring(0, 50),
      description: speechText,
      priority: "MEDIUM",
      rawDeadline: "tomorrow at 5 PM",
      estimatedCategory: "general",
      warning: "GEMINI_API_KEY is not configured. Falling back to local heuristics."
    });
  }

  try {
    const prompt = `Extract task properties from the following voice transcription. Create a concise title, set appropriate description, assign a realistic priority (CRITICAL, HIGH, MEDIUM, LOW), extract a human-readable deadline if mentioned (e.g. "tomorrow at 9 PM", "next Monday", "June 30th"), and categorize the task (e.g. bill, assignment, study, meeting, administrative, general).
    
    Transcription: "${speechText}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a natural language understanding module for a productivity application. Standardize input speech text into clean, structured task metadata.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "description", "priority", "rawDeadline", "estimatedCategory"],
          properties: {
            title: { type: Type.STRING, description: "Short, crisp task name." },
            description: { type: Type.STRING, description: "Detailed summary of the request." },
            priority: { type: Type.STRING, description: "CRITICAL, HIGH, MEDIUM, or LOW based on speech tone/urgency." },
            rawDeadline: { type: Type.STRING, description: "The raw deadline mentioned or a inferred timeline if none specified (e.g., 'by tonight', 'tomorrow')." },
            estimatedCategory: { type: Type.STRING, description: "Category of task: bill, study, assignment, meeting, chore, general." }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (error) {
    console.error("Gemini voice parsing error:", error);
    return res.status(500).json({ error: "Failed to parse voice transcription." });
  }
});

// Serve Frontend Vite Application
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`YourPa (Your Personal Assistant) server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
