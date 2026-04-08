# 🚀 NASA Image Verifier

> Verify the authenticity of NASA space mission images using AI vision + NASA's free Image Library API.

![NASA Image Verifier](https://img.shields.io/badge/NASA-Image%20Verifier-blue?style=for-the-badge&logo=nasa)
![Free](https://img.shields.io/badge/Free-No%20Login%20Required-green?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open-Source-orange?style=for-the-badge)

## ✨ Features

- 📸 **Upload any image** — drag & drop or click to browse
- 🤖 **AI Vision Analysis** — Claude analyzes the image for space content, artifacts, and visual cues
- 🛰️ **NASA Archive Search** — searches NASA's free Image & Video Library API for matching images
- ⚡ **Cross-Reference Verdict** — issues one of four verdicts:
  - ✅ **VERIFIED GENUINE** — strong match found in NASA archives
  - ✗ **LIKELY AI-GENERATED** — visual artifacts detected
  - ? **NOT FOUND IN NASA ARCHIVES** — looks real but no record found
  - ~ **PARTIAL MATCH** — inconclusive
- 📋 **Detailed Report** — mission details, NASA image ID, AI-generation indicators
- 💯 **Confidence score** with visual meter
- 🔗 **Direct link** to matching image on images.nasa.gov

## 🛠️ How It Works

```
User uploads image
        ↓
Claude Vision analyzes image
(extracts keywords, mission names, AI suspicion level)
        ↓
NASA Image Library API searched
(free, no API key needed)
        ↓
Claude cross-references findings
        ↓
Verification report issued
```

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/hvrcharon1/nasa-image-verifier.git
cd nasa-image-verifier

# Install dependencies
npm install

# Start the development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔌 APIs Used

| API | Purpose | Cost |
|-----|---------|------|
| [NASA Image & Video Library](https://images.nasa.gov) | Search NASA image archives | Free, no key needed |
| [Anthropic Claude API](https://anthropic.com) | AI vision analysis & verdict | Requires API key |

> **Note:** The app uses Claude's AI via the Anthropic API for image analysis. The Anthropic API key is handled by the Claude.ai artifact environment.

## 🏗️ Tech Stack

- **React 18** — UI framework
- **Claude claude-sonnet-4-20250514** — AI vision & reasoning
- **NASA Images API** — `https://images-api.nasa.gov/search`
- **Canvas API** — animated starfield background
- **Google Fonts** — Space Mono + Syne

## 📁 Project Structure

```
nasa-image-verifier/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx       # Main application component
│   └── index.js      # React entry point
├── package.json
└── README.md
```

## 🤝 Contributing

Pull requests are welcome! Feel free to open issues for bugs or feature requests.

## 📄 License

MIT License — free to use, modify, and distribute.

---


