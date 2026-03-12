# TruthGuard: AI-Powered Misinformation Intelligence

TruthGuard is a high-fidelity intelligence dashboard designed to combat the spread of misinformation, scams, and viral propaganda. Built with Next.js and Tailwind CSS, it provides real-time analysis of digital content to empower users with verifiable truth.

## 🚀 Run locally

```/dev/null/install.sh
npm install
npm run dev
```

Open `http://localhost:3000` to view the dashboard.

## ✨ Key Features

- **Multilingual Support:** Advanced NLP capabilities to detect and analyze misinformation phrases in **Hindi** and **Hinglish**, catering specifically to the Indian linguistic landscape.
- **Forwarded Message Detection:** Specialized detection for viral chain message patterns, common on platforms like WhatsApp, identifying "Forwarded many times" signatures and known propaganda templates.
- **Deep Content Analysis:**
  - Automated claim extraction from URLs and text.
  - Manipulation detection for emotionally charged or deceptive language.
  - Explainable trust timeline and score breakdown.
- **Interactive Feedback Loop:** Users can report false positives or missed scams, with data logged in `data/feedback-log.json` for continuous model improvement.

## 🛡️ Indian Fact-Check Integration

TruthGuard aggregates data from the most trusted IFCN-certified sources in India:
- **Alt News**
- **BOOM Live**
- **PIB Fact Check**
- **Vishvas News**
- **India Today Fact Check**
- **The Quint WebQoof**
- **FactChecker.in**
- **Google Fact Check Tools API**

## 📊 Scoring Methodology

TruthGuard utilizes a multi-factor weighted scoring algorithm to determine content credibility:

| Factor | Weight | Description |
| :--- | :--- | :--- |
| **Source Quality** | 28% | Evaluates the historical reliability and certification of the publishing entity. |
| **Cross-Source Agreement** | 22% | Measures consensus across multiple independent fact-checking organizations. |
| **Manipulation Resilience** | 16% | Detects use of logical fallacies, clickbait, and inflammatory rhetoric. |
| **Claim Specificity** | 14% | Analyzes how verifiable and grounded the individual claims are. |
| **Recency Context** | 10% | Adjusts scores based on the age of the information and evolving facts. |
| **Scam Resilience** | 10% | Identifies patterns common in financial fraud, phishing, and "get-rich-quick" schemes. |

## 🌐 Environment Setup

To enable live fact-check matching via Google's API, set your API key:

```/dev/null/env_setup.sh
# PowerShell
$env:GOOGLE_FACT_CHECK_API_KEY="your-key"

# Bash
export GOOGLE_FACT_CHECK_API_KEY="your-key"
```

---
*Built for the next generation of digital safety.*