import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --------------------
// Setup __dirname
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting server...");
console.log("__dirname:", __dirname);

// --------------------
// Load environment variables
// --------------------
// NOTE: On Render, env vars come from dashboard.
// This is ONLY for local development.
dotenv.config({ path: path.join(__dirname, '.env') });

// --------------------
// Express app
// --------------------
const app = express();
const PORT = process.env.PORT || 5000;

console.log("Express app created.");

// --------------------
// CORS
// --------------------
const allowedOrigins = [
  "http://localhost:5173",
  "https://dogsk.onrender.com",
  "https://dk2004.onrender.com",
  "https://dk-lsdr.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("Request from origin:", origin);
        callback(null, true); // allow for demo
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// --------------------
// API Key Validation
// --------------------
const groq_api_key = process.env.GROQ_API_KEY;
const openrouter_api_key = process.env.OPENROUTER_API_KEY;

// Prefer OpenRouter if available, fallback to Groq
const useOpenRouter = !!openrouter_api_key;
const api_key = openrouter_api_key || groq_api_key;

if (!api_key) {
  console.error("❌ No API key found! Set OPENROUTER_API_KEY or GROQ_API_KEY");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  } else {
    console.warn("⚠️  Running without valid API key. AI features won't work.");
  }
} else {
  const provider = useOpenRouter ? "OpenRouter" : "Groq";
  const maskedKey = `${api_key.slice(0, 10)}...${api_key.slice(-4)}`;
  console.log(`✅ Using ${provider} API: ${maskedKey}`);
}

// Groq SDK (fallback)
const groq = new Groq({
  apiKey: groq_api_key || "invalid-key",
});

// OpenRouter API call function
async function callOpenRouter(messages, maxTokens = 1024) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openrouter_api_key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://domaindetector.app",
      "X-Title": "DomainDetector"
    },
    body: JSON.stringify({
      model: "liquid/lfm-2.5-1.2b-instruct:free",
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// Unified LLM call function
async function callLLM(systemPrompt, userPrompt, maxTokens = 1024) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  if (useOpenRouter) {
    return await callOpenRouter(messages, maxTokens);
  } else {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: maxTokens,
      messages
    });
    return completion.choices[0]?.message?.content || "";
  }
}

// --------------------
// Load Knowledge Base
// --------------------
let knowledgeBase = [];

try {
  const kbPath = path.join(__dirname, "knowledge.json");
  if (fs.existsSync(kbPath)) {
    const data = fs.readFileSync(kbPath, "utf8");
    knowledgeBase = JSON.parse(data);
    console.log(`✅ Loaded ${knowledgeBase.length} chunks from knowledge base.`);
  } else {
    console.warn("⚠️ knowledge.json not found.");
  }
} catch (err) {
  console.error("❌ Failed to load knowledge base:", err.message);
}

// --------------------
// RAG Retrieval
// --------------------
function retrieveContext(query) {
  if (!knowledgeBase.length) return "";

  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (!terms.length) return "";

  const scored = knowledgeBase.map((chunk) => {
    let score = 0;
    const text = chunk.text.toLowerCase();

    terms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "g");
      const count = (text.match(regex) || []).length;
      score += count > 0 ? count * 10 : text.includes(term) ? 1 : 0;
    });

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3).filter((s) => s.score > 0);

  return top.map((s) => s.chunk.text).join("\n\n---\n\n");
}

// --------------------
// API Routes
// --------------------
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    const context = retrieveContext(message);

    const systemPrompt = `
You are DomainDetector, a friendly career mentor.

${context ? `Context:\n${context}` : "Use general tech knowledge."}

Be helpful, concise, friendly, under 300 words.
`;

    const reply = await callLLM(systemPrompt, message, 1024);
    res.json({ reply });
  } catch (err) {
    console.error("❌ Chat error:", err.message);
    res.status(500).json({ error: "Chat failed" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Backend working" });
});

// --------------------
// Career Quiz API
// --------------------

// Domain scoring weights for each question option (Scale: 1-5)
// 5 = Perfect match, 4 = Strong match, 3 = Good match, 2 = Some relevance, 1 = Minor relevance
const quizScoring = {
  // Question 1: Logic vs Creativity preference
  "Logic and problem-solving": {
    "Software Development": 5,
    "Data Science": 5,
    "AI / Machine Learning": 5,
    "Cybersecurity": 4,
  },
  "Creativity and design": {
    "Web Designing": 5,
    "Web Development": 3,
    "Mobile App Development": 3,
  },
  "A mix of both": {
    "Web Development": 4,
    "Mobile App Development": 4,
    "Web Designing": 3,
    "Software Development": 2,
  },

  // Question 2: Math comfort level
  "Very comfortable": {
    "Data Science": 5,
    "AI / Machine Learning": 5,
    "Software Development": 3,
    "Cybersecurity": 2,
  },
  "Somewhat comfortable": {
    "Web Development": 3,
    "Software Development": 3,
    "Mobile App Development": 3,
    "Cybersecurity": 2,
  },
  "Not my strength": {
    "Web Designing": 4,
    "Typewriting": 4,
    "ATS-Friendly Resume": 4,
  },

  // Question 3: Coding experience
  "Experienced coder": {
    "Software Development": 5,
    "AI / Machine Learning": 4,
    "Web Development": 4,
    "Data Science": 3,
    "Cybersecurity": 3,
  },
  "Some coding knowledge": {
    "Web Development": 4,
    "Mobile App Development": 4,
    "Data Science": 2,
    "Web Designing": 2,
  },
  "Complete beginner": {
    "Web Designing": 3,
    "Typewriting": 5,
    "ATS-Friendly Resume": 5,
  },

  // Question 4: Interest area (HIGH IMPORTANCE)
  "Building websites and apps": {
    "Web Development": 5,
    "Mobile App Development": 5,
    "Software Development": 2,
  },
  "Analyzing data and patterns": {
    "Data Science": 5,
    "AI / Machine Learning": 4,
  },
  "Creating visual designs": {
    "Web Designing": 5,
    "Web Development": 2,
  },
  "Protecting systems from threats": {
    "Cybersecurity": 5,
    "Software Development": 1,
  },
  "Writing and documentation": {
    "Typewriting": 5,
    "ATS-Friendly Resume": 4,
  },

  // Question 5: Problem solving preference
  "Breaking down complex systems": {
    "Software Development": 5,
    "AI / Machine Learning": 4,
    "Cybersecurity": 4,
  },
  "Visualizing and prototyping": {
    "Web Designing": 5,
    "Web Development": 3,
    "Mobile App Development": 3,
  },
  "Finding patterns in data": {
    "Data Science": 5,
    "AI / Machine Learning": 5,
  },
  "Following structured processes": {
    "Typewriting": 4,
    "ATS-Friendly Resume": 4,
    "Cybersecurity": 2,
  },

  // Question 6: Work environment preference
  "Building products from scratch": {
    "Software Development": 4,
    "Mobile App Development": 4,
    "Web Development": 4,
  },
  "Research and experimentation": {
    "AI / Machine Learning": 5,
    "Data Science": 5,
  },
  "Creating user experiences": {
    "Web Designing": 5,
    "Web Development": 3,
    "Mobile App Development": 2,
  },
  "Security and protection": {
    "Cybersecurity": 5,
  },

  // Question 7: Career goal
  "Tech startup or product company": {
    "Software Development": 4,
    "Web Development": 4,
    "Mobile App Development": 4,
    "AI / Machine Learning": 2,
  },
  "Data-driven organization": {
    "Data Science": 5,
    "AI / Machine Learning": 4,
  },
  "Design agency or freelance": {
    "Web Designing": 5,
    "Web Development": 2,
    "ATS-Friendly Resume": 1,
  },
  "Corporate IT or security": {
    "Cybersecurity": 5,
    "Software Development": 2,
  },
  "Administrative or clerical roles": {
    "Typewriting": 5,
    "ATS-Friendly Resume": 4,
  },

  // Question 8: Learning new technologies
  "I love staying updated with latest tech": {
    "AI / Machine Learning": 4,
    "Web Development": 4,
    "Mobile App Development": 3,
    "Software Development": 2,
  },
  "I prefer mastering a few technologies deeply": {
    "Software Development": 5,
    "Data Science": 4,
    "Cybersecurity": 3,
  },
  "I learn what's necessary for my work": {
    "Web Designing": 3,
    "Cybersecurity": 3,
    "Web Development": 2,
  },
  "I prefer stable, established tools": {
    "Typewriting": 4,
    "ATS-Friendly Resume": 4,
  },

  // Question 9: Project excitement (HIGH IMPORTANCE)
  "Building interactive user interfaces": {
    "Web Development": 5,
    "Mobile App Development": 5,
    "Web Designing": 2,
  },
  "Creating intelligent systems and algorithms": {
    "AI / Machine Learning": 5,
    "Software Development": 4,
    "Data Science": 2,
  },
  "Designing beautiful visual experiences": {
    "Web Designing": 5,
  },
  "Securing systems and finding vulnerabilities": {
    "Cybersecurity": 5,
  },
  "Working with databases and analytics": {
    "Data Science": 5,
    "Software Development": 2,
    "AI / Machine Learning": 2,
  },

  // Question 10: Work preference
  "Independently on focused tasks": {
    "Software Development": 3,
    "Data Science": 4,
    "Typewriting": 3,
    "AI / Machine Learning": 3,
  },
  "Collaborating with a team": {
    "Web Development": 4,
    "Mobile App Development": 4,
    "Web Designing": 3,
  },
  "Leading and mentoring others": {
    "Software Development": 3,
    "Cybersecurity": 3,
    "Data Science": 2,
  },
  "Following clear guidelines and procedures": {
    "Typewriting": 5,
    "ATS-Friendly Resume": 5,
  },

  // Question 11: Attention to detail
  "Very high - I notice every small detail": {
    "Cybersecurity": 5,
    "Web Designing": 4,
    "Typewriting": 4,
    "ATS-Friendly Resume": 3,
  },
  "Moderate - I focus on important details": {
    "Software Development": 3,
    "Web Development": 3,
    "Data Science": 3,
    "Mobile App Development": 2,
  },
  "I prefer big-picture thinking": {
    "AI / Machine Learning": 4,
    "Mobile App Development": 3,
    "Software Development": 2,
  },

  // Question 12: Skill development (HIGH IMPORTANCE)
  "Programming and algorithms": {
    "Software Development": 5,
    "AI / Machine Learning": 4,
    "Data Science": 2,
  },
  "Data analysis and visualization": {
    "Data Science": 5,
    "AI / Machine Learning": 4,
  },
  "UI/UX design principles": {
    "Web Designing": 5,
    "Web Development": 3,
    "Mobile App Development": 2,
  },
  "Network and system security": {
    "Cybersecurity": 5,
  },
  "Communication and documentation": {
    "Typewriting": 5,
    "ATS-Friendly Resume": 5,
  },

  // Question 13: Complex problem handling
  "Write code to automate solutions": {
    "Software Development": 5,
    "Web Development": 3,
    "AI / Machine Learning": 2,
  },
  "Analyze data to find insights": {
    "Data Science": 5,
    "AI / Machine Learning": 4,
  },
  "Create visual diagrams and mockups": {
    "Web Designing": 5,
    "Mobile App Development": 2,
    "Web Development": 2,
  },
  "Research and document solutions": {
    "ATS-Friendly Resume": 4,
    "Typewriting": 4,
  },
  "Test and identify weaknesses": {
    "Cybersecurity": 5,
    "Software Development": 2,
  },

  // Question 14: Work motivation
  "Building things people use daily": {
    "Web Development": 5,
    "Mobile App Development": 5,
    "Software Development": 3,
  },
  "Discovering insights from data": {
    "Data Science": 5,
    "AI / Machine Learning": 4,
  },
  "Making things look beautiful": {
    "Web Designing": 5,
  },
  "Keeping systems safe and secure": {
    "Cybersecurity": 5,
  },
  "Helping others communicate effectively": {
    "Typewriting": 5,
    "ATS-Friendly Resume": 5,
  },

  // Question 15: Industry preference
  "Technology and software companies": {
    "Software Development": 4,
    "Web Development": 4,
    "Mobile App Development": 4,
    "AI / Machine Learning": 2,
  },
  "Finance and analytics firms": {
    "Data Science": 5,
    "AI / Machine Learning": 4,
    "Software Development": 1,
  },
  "Creative and marketing agencies": {
    "Web Designing": 5,
    "Web Development": 3,
  },
  "Government and defense": {
    "Cybersecurity": 5,
    "Software Development": 2,
  },
  "Education and publishing": {
    "Typewriting": 5,
    "ATS-Friendly Resume": 4,
  },
};

// All available domains
const allDomains = [
  "Software Development",
  "Web Development",
  "Mobile App Development",
  "AI / Machine Learning",
  "Web Designing",
  "Data Science",
  "Cybersecurity",
  "Typewriting",
  "ATS-Friendly Resume",
];

// Calculate domain scores from answers
function calculateDomainScores(answers) {
  const scores = {};
  allDomains.forEach((domain) => (scores[domain] = 0));

  // Question importance weights (some questions matter more)
  const questionImportance = [
    1.5, // Q1: Logic vs Creativity - HIGH importance
    1.3, // Q2: Math comfort - HIGH importance
    1.4, // Q3: Coding experience - HIGH importance
    1.5, // Q4: Interest area - HIGHEST importance
    1.2, // Q5: Problem solving
    1.1, // Q6: Work environment
    1.0, // Q7: Career goal
    0.9, // Q8: Learning preference
    1.3, // Q9: Project excitement - HIGH
    0.8, // Q10: Work style
    0.9, // Q11: Attention to detail
    1.2, // Q12: Skill development - HIGH
    1.1, // Q13: Problem handling
    1.0, // Q14: Motivation
    1.0, // Q15: Industry
  ];

  answers.forEach((answer, index) => {
    const weights = quizScoring[answer];
    const importance = questionImportance[index] || 1.0;
    
    if (weights) {
      Object.entries(weights).forEach(([domain, weight]) => {
        // Apply importance multiplier
        scores[domain] = (scores[domain] || 0) + (weight * importance);
      });
    }
  });

  // Round scores for cleaner output
  Object.keys(scores).forEach(domain => {
    scores[domain] = Math.round(scores[domain] * 10) / 10;
  });

  return scores;
}

// Get top domain and confidence with improved algorithm
function getRecommendation(scores) {
  const entries = Object.entries(scores);
  entries.sort((a, b) => b[1] - a[1]);

  const topDomain = entries[0][0];
  const topScore = entries[0][1];
  const secondScore = entries[1] ? entries[1][1] : 0;
  const totalScore = entries.reduce((sum, [, score]) => sum + score, 0);

  // Calculate confidence based on multiple factors:
  // 1. Gap between top and second domain (bigger gap = more confident)
  // 2. Top score as percentage of maximum possible
  // 3. How much top domain stands out from average
  
  const scoreGap = topScore - secondScore;
  const avgScore = totalScore / entries.length;
  const standoutFactor = topScore / (avgScore || 1);
  
  // Maximum possible score per domain (roughly 5 points * 15 questions * 1.5 importance)
  const maxPossible = 75;
  const topPercentage = (topScore / maxPossible) * 100;
  
  // Combined confidence calculation
  let confidence = 0;
  
  // Base confidence from score gap (0-25 points)
  confidence += Math.min(scoreGap * 2, 25);
  
  // Top percentage contribution (0-35 points)
  confidence += Math.min(topPercentage * 0.35, 35);
  
  // Standout factor (0-25 points) - how much above average
  confidence += Math.min((standoutFactor - 1) * 25, 25);
  
  // Ensure reasonable bounds
  confidence = Math.max(45, Math.min(98, Math.round(confidence + 35)));
  
  // Additional top domains for secondary recommendations
  const secondDomain = entries[1] ? entries[1][0] : null;
  const thirdDomain = entries[2] ? entries[2][0] : null;

  return { 
    domain: topDomain, 
    confidence,
    secondChoice: secondScore >= topScore * 0.85 ? secondDomain : null,
    thirdChoice: entries[2] && entries[2][1] >= topScore * 0.7 ? thirdDomain : null
  };
}

app.post("/api/career-quiz", async (req, res) => {
  try {
    const { answers } = req.body;

    // Input validation
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ 
        error: "Invalid request: answers array required" 
      });
    }

    if (answers.length < 10) {
      return res.status(400).json({ 
        error: "Please answer at least 10 questions" 
      });
    }

    // Calculate scores
    const scores = calculateDomainScores(answers);
    const { domain, confidence, secondChoice, thirdChoice } = getRecommendation(scores);

    // Generate AI explanation with improved prompt
    const answersSummary = answers.join(", ");
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topThreeStr = sortedScores.map(([d, s]) => `${d} (${s} points)`).join(", ");
    
    const systemPrompt = `You are an expert career counselor specializing in tech careers. 
You provide accurate, personalized guidance based on assessment data. 
Be specific about WHY their answers indicate this career path.`;

    const userPrompt = `A student completed a comprehensive 15-question career assessment.

Their responses: ${answersSummary}

Assessment Results:
- Primary Recommendation: ${domain} (${confidence}% confidence)
- Top 3 domains by score: ${topThreeStr}
${secondChoice ? `- Close second: ${secondChoice} (consider as alternative)` : ''}

Write a personalized explanation (120-180 words) that:
1. Specifically connects 2-3 of their answers to why ${domain} fits them
2. Highlights the key strengths they demonstrated (logic, creativity, attention to detail, etc.)
3. Mentions what makes ${domain} exciting and in-demand
4. Gives one concrete next step they can take today

Write in a warm, encouraging tone. Be specific - reference their actual quiz answers. Use flowing paragraphs, not bullet points.`;

    const reason = await callLLM(systemPrompt, userPrompt, 400) || 
      `Based on your assessment, ${domain} strongly aligns with your interests and aptitudes.`;

    res.json({
      domain,
      confidence,
      reason,
      scores,
      secondChoice: secondChoice || null,
      thirdChoice: thirdChoice || null,
    });

  } catch (err) {
    console.error("❌ Career Quiz error:", err.message);
    console.error("Full error:", err);
    res.status(500).json({ error: "Failed to process quiz. Please try again." });
  }
});

// --------------------
// Serve React build
// --------------------
app.use(express.static(path.join(__dirname, "../dist")));

// ✅ SPA fallback — SAFE FOR NODE 22
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// --------------------
// Start server
// --------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
