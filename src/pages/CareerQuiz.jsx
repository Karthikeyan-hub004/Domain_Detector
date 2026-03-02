import { useState } from "react";
import { Link } from "react-router-dom";
import "./CareerQuiz.css";

// Quiz questions with options
const quizQuestions = [
  {
    id: 1,
    question: "Do you prefer logic-based tasks or creative tasks?",
    options: [
      "Logic and problem-solving",
      "Creativity and design",
      "A mix of both",
    ],
  },
  {
    id: 2,
    question: "How comfortable are you with mathematics and statistics?",
    options: [
      "Very comfortable",
      "Somewhat comfortable",
      "Not my strength",
    ],
  },
  {
    id: 3,
    question: "What's your coding experience level?",
    options: [
      "Experienced coder",
      "Some coding knowledge",
      "Complete beginner",
    ],
  },
  {
    id: 4,
    question: "Which area interests you the most?",
    options: [
      "Building websites and apps",
      "Analyzing data and patterns",
      "Creating visual designs",
      "Protecting systems from threats",
      "Writing and documentation",
    ],
  },
  {
    id: 5,
    question: "How do you prefer to solve problems?",
    options: [
      "Breaking down complex systems",
      "Visualizing and prototyping",
      "Finding patterns in data",
      "Following structured processes",
    ],
  },
  {
    id: 6,
    question: "What type of work environment excites you?",
    options: [
      "Building products from scratch",
      "Research and experimentation",
      "Creating user experiences",
      "Security and protection",
    ],
  },
  {
    id: 7,
    question: "What's your ideal career goal?",
    options: [
      "Tech startup or product company",
      "Data-driven organization",
      "Design agency or freelance",
      "Corporate IT or security",
      "Administrative or clerical roles",
    ],
  },
  {
    id: 8,
    question: "How do you feel about learning new technologies?",
    options: [
      "I love staying updated with latest tech",
      "I prefer mastering a few technologies deeply",
      "I learn what's necessary for my work",
      "I prefer stable, established tools",
    ],
  },
  {
    id: 9,
    question: "What type of projects excite you most?",
    options: [
      "Building interactive user interfaces",
      "Creating intelligent systems and algorithms",
      "Designing beautiful visual experiences",
      "Securing systems and finding vulnerabilities",
      "Working with databases and analytics",
    ],
  },
  {
    id: 10,
    question: "How do you prefer to work?",
    options: [
      "Independently on focused tasks",
      "Collaborating with a team",
      "Leading and mentoring others",
      "Following clear guidelines and procedures",
    ],
  },
  {
    id: 11,
    question: "What's your attention to detail level?",
    options: [
      "Very high - I notice every small detail",
      "Moderate - I focus on important details",
      "I prefer big-picture thinking",
    ],
  },
  {
    id: 12,
    question: "Which skill would you most like to develop?",
    options: [
      "Programming and algorithms",
      "Data analysis and visualization",
      "UI/UX design principles",
      "Network and system security",
      "Communication and documentation",
    ],
  },
  {
    id: 13,
    question: "How do you handle complex problems?",
    options: [
      "Write code to automate solutions",
      "Analyze data to find insights",
      "Create visual diagrams and mockups",
      "Research and document solutions",
      "Test and identify weaknesses",
    ],
  },
  {
    id: 14,
    question: "What motivates you most at work?",
    options: [
      "Building things people use daily",
      "Discovering insights from data",
      "Making things look beautiful",
      "Keeping systems safe and secure",
      "Helping others communicate effectively",
    ],
  },
  {
    id: 15,
    question: "Which industry appeals to you most?",
    options: [
      "Technology and software companies",
      "Finance and analytics firms",
      "Creative and marketing agencies",
      "Government and defense",
      "Education and publishing",
    ],
  },
];

// Map domain names to URL slugs
const domainSlugMap = {
  "Software Development": "software-development",
  "Web Development": "web-development",
  "Mobile App Development": "mobile-app-development",
  "AI / Machine Learning": "ai-machine-learning",
  "Web Designing": "web-designing",
  "Data Science": "data-science",
  "Cybersecurity": "cybersecurity",
  "Typewriting": "typewriting",
  "ATS-Friendly Resume": "ats-friendly-resume",
};

export default function CareerQuiz() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const totalQuestions = quizQuestions.length;
  const isQuizComplete = currentStep >= totalQuestions;

  // Handle option selection
  const handleOptionSelect = (option) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = option;
    setAnswers(newAnswers);
  };

  // Go to next question
  const handleNext = () => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit quiz
      submitQuiz();
    }
  };

  // Go to previous question
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit quiz to backend
  const submitQuiz = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use localhost for development, production URL otherwise
      const API_BASE = import.meta.env.DEV 
        ? "http://localhost:5000" 
        : (import.meta.env.VITE_API_URL?.replace("/chat", "") || "https://dk-lsdr.onrender.com");
      const response = await fetch(`${API_BASE}/api/career-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        throw new Error("Failed to get recommendation");
      }

      const data = await response.json();
      setResult(data);
      setCurrentStep(totalQuestions); // Move to result screen
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error("Quiz submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Reset quiz
  const handleRetake = () => {
    setCurrentStep(0);
    setAnswers([]);
    setResult(null);
    setError(null);
  };

  // Progress percentage
  const progress = Math.round(((currentStep) / totalQuestions) * 100);

  // Render loading state
  if (loading) {
    return (
      <div className="career-quiz">
        <div className="quiz-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Analyzing Your Responses...</h2>
            <p>Our AI is finding the perfect career path for you</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="career-quiz">
        <div className="quiz-container">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <h2>Oops! Something went wrong</h2>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={handleRetake}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render result screen
  if (isQuizComplete && result) {
    const domainSlug = domainSlugMap[result.domain];
    
    return (
      <div className="career-quiz">
        <div className="quiz-container result-container">
          <div className="result-header">
            <span className="result-icon">🎯</span>
            <h1>Your Career Match</h1>
          </div>

          <div className="result-card">
            <h2 className="result-domain">{result.domain}</h2>
            
            <div className="confidence-meter">
              <div className="confidence-label">
                <span>Match Confidence</span>
                <span className="confidence-value">{result.confidence}%</span>
              </div>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{ width: `${result.confidence}%` }}
                ></div>
              </div>
            </div>

            {/* Show alternative recommendations if scores are close */}
            {result.secondChoice && (
              <div className="alternative-recommendations">
                <p className="alt-label">Also consider:</p>
                <div className="alt-domains">
                  <span className="alt-domain">{result.secondChoice}</span>
                  {result.thirdChoice && (
                    <span className="alt-domain">{result.thirdChoice}</span>
                  )}
                </div>
              </div>
            )}

            <div className="result-explanation">
              <h3>Why This Domain?</h3>
              <p>{result.reason}</p>
            </div>

            <div className="result-actions">
              {domainSlug && (
                <Link to={`/domain/${domainSlug}`} className="btn btn-primary">
                  Explore {result.domain}
                </Link>
              )}
              <Link to="/home" className="btn btn-outline">
                View All Domains
              </Link>
              <button className="btn btn-outline" onClick={handleRetake}>
                Retake Quiz
              </button>
            </div>
          </div>

          <div className="result-scores">
            <h3>All Domain Scores</h3>
            <div className="scores-grid">
              {result.scores && Object.entries(result.scores)
                .sort((a, b) => b[1] - a[1])
                .map(([domain, score]) => (
                  <div key={domain} className={`score-item ${domain === result.domain ? 'top-score' : ''}`}>
                    <span className="score-domain">{domain}</span>
                    <div className="score-bar-container">
                      <div 
                        className="score-bar" 
                        style={{ 
                          width: `${Math.max((score / Math.max(...Object.values(result.scores))) * 100, 5)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="score-value">{score}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render quiz question
  const currentQuestion = quizQuestions[currentStep];

  return (
    <div className="career-quiz">
      <div className="quiz-container">
        {/* Header */}
        <div className="quiz-header">
          <h1>🎓 AI Career Quiz</h1>
          <p>Discover your ideal tech career path</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-info">
            <span>Question {currentStep + 1} of {totalQuestions}</span>
            <span>{progress}% Complete</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="question-section">
          <h2 className="question-text">{currentQuestion.question}</h2>
          
          <div className="options-list">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${answers[currentStep] === option ? "selected" : ""}`}
                onClick={() => handleOptionSelect(option)}
              >
                <span className="option-indicator">
                  {answers[currentStep] === option ? "✓" : String.fromCharCode(65 + index)}
                </span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="quiz-navigation">
          <button 
            className="btn btn-outline" 
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            ← Previous
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleNext}
            disabled={!answers[currentStep]}
          >
            {currentStep === totalQuestions - 1 ? "Get Results 🚀" : "Next →"}
          </button>
        </div>

        {/* Question indicators */}
        <div className="question-indicators">
          {quizQuestions.map((_, index) => (
            <div 
              key={index} 
              className={`indicator ${index === currentStep ? "active" : ""} ${answers[index] ? "answered" : ""}`}
              onClick={() => answers[index] && setCurrentStep(index)}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
