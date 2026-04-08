import { useState, useRef, useCallback, useEffect } from "react";

// ── Starfield background ──────────────────────────────────────────────────────
function Starfield() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.003 + 0.001,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.alpha * 0.7})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Returns both the raw base64 and the full data: URL (for reliable iframe preview)
const readImage = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result;
      const base64 = dataUrl.split(",")[1];
      res({ dataUrl, base64 });
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });

async function searchNASA(query) {
  try {
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(
      query
    )}&media_type=image&page_size=6`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.collection?.items || [];
    return items.slice(0, 6).map((item) => ({
      title: item.data?.[0]?.title || "Untitled",
      description: item.data?.[0]?.description || "",
      date: item.data?.[0]?.date_created || "",
      center: item.data?.[0]?.center || "",
      nasaId: item.data?.[0]?.nasa_id || "",
      keywords: item.data?.[0]?.keywords || [],
      thumb: item.links?.[0]?.href || null,
    }));
  } catch {
    return [];
  }
}

async function callClaude(messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content?.find((b) => b.type === "text")?.text || "";
}

// ── Verdict badge ─────────────────────────────────────────────────────────────
function Verdict({ verdict }) {
  const map = {
    GENUINE: {
      color: "#00ff9d",
      bg: "rgba(0,255,157,0.08)",
      border: "rgba(0,255,157,0.35)",
      icon: "✓",
      label: "VERIFIED GENUINE",
    },
    NOT_FOUND: {
      color: "#ffb347",
      bg: "rgba(255,179,71,0.08)",
      border: "rgba(255,179,71,0.35)",
      icon: "?",
      label: "NOT FOUND IN NASA ARCHIVES",
    },
    AI_GENERATED: {
      color: "#ff4b6e",
      bg: "rgba(255,75,110,0.08)",
      border: "rgba(255,75,110,0.35)",
      icon: "✗",
      label: "LIKELY AI-GENERATED / FAKE",
    },
    PARTIAL: {
      color: "#79b8ff",
      bg: "rgba(121,184,255,0.08)",
      border: "rgba(121,184,255,0.35)",
      icon: "~",
      label: "PARTIAL MATCH — INCONCLUSIVE",
    },
  };
  const v = map[verdict] || map.NOT_FOUND;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 4,
        background: v.bg,
        border: `1.5px solid ${v.border}`,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 20,
          color: v.color,
          fontWeight: 700,
        }}
      >
        {v.icon}
      </span>
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 13,
          color: v.color,
          letterSpacing: "0.12em",
          fontWeight: 700,
        }}
      >
        {v.label}
      </span>
    </div>
  );
}

// ── NASA result card ──────────────────────────────────────────────────────────
function NASACard({ item }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(121,184,255,0.2)",
        borderRadius: 6,
        padding: 14,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      {item.thumb && (
        <img
          src={item.thumb}
          alt={item.title}
          style={{
            width: 90,
            height: 68,
            objectFit: "cover",
            borderRadius: 4,
            border: "1px solid rgba(121,184,255,0.25)",
            flexShrink: 0,
          }}
          onError={(e) => (e.target.style.display = "none")}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: 13,
            fontWeight: 600,
            color: "#79b8ff",
            fontFamily: "'Space Mono', monospace",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.title}
        </p>
        {item.nasaId && (
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "monospace",
            }}
          >
            ID: {item.nasaId}
            {item.center ? ` · ${item.center}` : ""}
            {item.date ? ` · ${item.date.slice(0, 10)}` : ""}
          </p>
        )}
        {item.description && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Typing animation ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#79b8ff",
            display: "inline-block",
            animation: `pulse 1.2s ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function NASAVerifier() {
  const [image, setImage] = useState(null); // { file, url, base64, type }
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (result) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result]);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const { dataUrl, base64 } = await readImage(file);
    setImage({ file, url: dataUrl, base64, type: file.type });
    setResult(null);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const verify = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);

    try {
      // Step 1: Claude analyzes the image
      setStatus("🔭  Analyzing image with AI vision...");
      const analysisText = await callClaude(
        [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.type,
                  data: image.base64,
                },
              },
              {
                type: "text",
                text: `Analyze this image and respond ONLY in JSON (no markdown fences). The JSON must have:
{
  "description": "detailed description of what you see",
  "searchKeywords": ["3-5 specific NASA search keywords, e.g. mission names, spacecraft, planet names, celestial objects"],
  "missionHints": ["any NASA mission names, spacecraft, astronauts, or programs you can identify"],
  "aiSuspicion": "LOW | MEDIUM | HIGH — your assessment of likelihood this is AI-generated based on visual artifacts",
  "aiSuspicionReason": "brief reason for the AI suspicion score",
  "imageType": "SPACE_PHOTO | EARTH_PHOTO | SPACECRAFT | ASTRONAUT | DIAGRAM | UNCLEAR | UNRELATED"
}`,
              },
            ],
          },
        ],
        "You are a NASA image expert and AI detection specialist. Always respond with valid JSON only."
      );

      let analysis;
      try {
        const clean = analysisText.replace(/```json|```/g, "").trim();
        analysis = JSON.parse(clean);
      } catch {
        analysis = {
          description: analysisText,
          searchKeywords: ["NASA space"],
          missionHints: [],
          aiSuspicion: "MEDIUM",
          aiSuspicionReason: "Unable to parse structured analysis",
          imageType: "UNCLEAR",
        };
      }

      // Step 2: Search NASA image library
      setStatus("🛰️  Searching NASA Image & Video Library...");
      const queries = [
        ...(analysis.missionHints || []),
        ...(analysis.searchKeywords || []),
      ].slice(0, 3);

      let nasaResults = [];
      for (const q of queries) {
        if (q.trim()) {
          const found = await searchNASA(q);
          nasaResults = [...nasaResults, ...found];
        }
      }

      // Deduplicate
      const seen = new Set();
      nasaResults = nasaResults.filter((r) => {
        if (seen.has(r.nasaId)) return false;
        seen.add(r.nasaId);
        return true;
      });

      // Step 3: Claude gives the final verdict
      setStatus("⚡  Cross-referencing with NASA database...");
      const nasaSummary =
        nasaResults.length > 0
          ? nasaResults
              .slice(0, 4)
              .map(
                (r, i) =>
                  `[${i + 1}] Title: ${r.title} | NASA ID: ${r.nasaId} | Center: ${r.center} | Date: ${r.date?.slice(0, 10)} | Desc: ${r.description?.slice(0, 120)}`
              )
              .join("\n")
          : "No matching images found in NASA archives.";

      const userQ = question.trim() || "Is this a genuine NASA image?";

      const verdictText = await callClaude(
        [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.type,
                  data: image.base64,
                },
              },
              {
                type: "text",
                text: `User question: "${userQ}"

Image Analysis:
- Description: ${analysis.description}
- AI Suspicion Level: ${analysis.aiSuspicion} — ${analysis.aiSuspicionReason}
- Mission Hints: ${analysis.missionHints?.join(", ") || "None"}
- Image Type: ${analysis.imageType}

NASA Archive Search Results:
${nasaSummary}

Based on the image analysis AND the NASA archive search results, respond ONLY in JSON:
{
  "verdict": "GENUINE | NOT_FOUND | AI_GENERATED | PARTIAL",
  "confidence": 0-100,
  "summary": "2-3 sentence plain English explanation of the verdict",
  "matchedNasaId": "NASA ID of the best matching image, or null",
  "matchedTitle": "title of the best matching NASA image, or null",
  "missionDetails": "details about the NASA mission/context if GENUINE, or null",
  "aiIndicators": ["list of visual AI-artifact indicators if AI_GENERATED, or empty"],
  "recommendation": "what the user should know or do next"
}

Rules:
- GENUINE: only if you found a strongly matching NASA archive image with high visual similarity
- AI_GENERATED: if AI suspicion is HIGH or image shows clear AI artifacts (impossible physics, warped text, etc.)
- NOT_FOUND: image looks like a real space photo but no matching NASA record found
- PARTIAL: some visual similarity but cannot definitively confirm or deny`,
              },
            ],
          },
        ],
        "You are a NASA image authenticity expert. Always respond with valid JSON only. Be honest and critical — do not confirm genuineness without strong evidence."
      );

      let verdict;
      try {
        const clean = verdictText.replace(/```json|```/g, "").trim();
        verdict = JSON.parse(clean);
      } catch {
        verdict = {
          verdict: "NOT_FOUND",
          confidence: 30,
          summary: "Unable to definitively verify this image against NASA archives.",
          matchedNasaId: null,
          matchedTitle: null,
          missionDetails: null,
          aiIndicators: [],
          recommendation: "Try searching NASA's official image library manually.",
        };
      }

      setResult({
        analysis,
        nasaResults: nasaResults.slice(0, 4),
        verdict,
        userQuestion: userQ,
      });
    } catch (err) {
      setResult({
        error: err.message || "Verification failed. Please try again.",
      });
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  const reset = () => {
    setImage(null);
    setQuestion("");
    setResult(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #05080f; }
        @keyframes pulse { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline {
          0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)}
        }
        @keyframes shimmer {
          0%{background-position:-200% 0} 100%{background-position:200% 0}
        }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#08101e} ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:2px}
        textarea:focus, input:focus { outline: none; }
        textarea { resize: none; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at 20% 0%, #0a1628 0%, #05080f 60%)",
          color: "#e8eef8",
          fontFamily: "'Syne', sans-serif",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <Starfield />

        {/* Scanline effect */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 820,
            margin: "0 auto",
            padding: "40px 20px 80px",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(121,184,255,0.07)",
                border: "1px solid rgba(121,184,255,0.2)",
                borderRadius: 100,
                padding: "6px 18px",
                marginBottom: 24,
                animation: "fadeUp 0.6s ease both",
              }}
            >
              <span style={{ fontSize: 11, color: "#79b8ff", fontFamily: "'Space Mono', monospace", letterSpacing: "0.15em" }}>
                FREE · NO LOGIN · OPEN SOURCE
              </span>
            </div>

            <div style={{ animation: "fadeUp 0.6s 0.1s ease both" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48,
                  background: "linear-gradient(135deg, #1a4a8a, #0a2040)",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26,
                  border: "1px solid rgba(121,184,255,0.3)",
                  boxShadow: "0 0 24px rgba(121,184,255,0.15)"
                }}>🚀</div>
                <h1 style={{
                  fontSize: "clamp(26px, 5vw, 40px)",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #ffffff 0%, #79b8ff 50%, #4d9aff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}>
                  NASA Image Verifier
                </h1>
              </div>
              <p style={{
                fontSize: 15,
                color: "rgba(255,255,255,0.45)",
                maxWidth: 480,
                margin: "0 auto",
                lineHeight: 1.7,
                fontWeight: 400,
              }}>
                Upload any space image to verify its authenticity against NASA's official archives. Detect AI-generated fakes instantly.
              </p>
            </div>
          </div>

          {/* Upload zone */}
          <div style={{ animation: "fadeUp 0.6s 0.2s ease both" }}>
            {!image ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? "rgba(121,184,255,0.7)" : "rgba(121,184,255,0.2)"}`,
                  borderRadius: 12,
                  padding: "56px 32px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "rgba(121,184,255,0.05)" : "rgba(255,255,255,0.015)",
                  transition: "all 0.2s",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16, filter: "drop-shadow(0 0 12px rgba(121,184,255,0.4))" }}>🛸</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#79b8ff", marginBottom: 6 }}>
                  Drop your image here
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                  or click to browse — JPG, PNG, WebP supported
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid rgba(121,184,255,0.25)",
                  marginBottom: 20,
                  position: "relative",
                  background: "#08101e",
                }}
              >
                {/* Image preview */}
                <div style={{ position: "relative" }}>
                  <img
                    src={image.url}
                    alt="Uploaded"
                    style={{
                      width: "100%",
                      maxHeight: 360,
                      objectFit: "contain",
                      display: "block",
                      background: "#040810",
                    }}
                  />
                  <button
                    onClick={reset}
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: "rgba(0,0,0,0.7)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    × CHANGE
                  </button>
                  {/* Corner brackets */}
                  {["top:8px;left:8px;border-top:2px solid;border-left:2px solid",
                    "top:8px;right:8px;border-top:2px solid;border-right:2px solid",
                    "bottom:8px;left:8px;border-bottom:2px solid;border-left:2px solid",
                    "bottom:8px;right:8px;border-bottom:2px solid;border-right:2px solid",
                  ].map((s, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      width: 18, height: 18,
                      borderColor: "rgba(121,184,255,0.6)",
                      ...Object.fromEntries(s.split(";").map(p => {
                        const [k, v] = p.split(":");
                        return [k, v];
                      }))
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Question input */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(121,184,255,0.2)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything… e.g. 'Is this from the Apollo 11 mission?' or 'Is this AI-generated?'"
                rows={2}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "#e8eef8",
                  fontSize: 14,
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1.6,
                  caretColor: "#79b8ff",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && image && !loading) {
                    e.preventDefault();
                    verify();
                  }
                }}
              />
              <button
                onClick={verify}
                disabled={!image || loading}
                style={{
                  background: image && !loading
                    ? "linear-gradient(135deg, #1a4a8a, #0d3060)"
                    : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(121,184,255,0.35)",
                  color: image && !loading ? "#79b8ff" : "rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  cursor: image && !loading ? "pointer" : "not-allowed",
                  letterSpacing: "0.08em",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {loading ? <TypingDots /> : "VERIFY ↗"}
              </button>
            </div>

            {/* Status */}
            {loading && status && (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  color: "#79b8ff",
                  padding: "10px 14px",
                  background: "rgba(121,184,255,0.06)",
                  border: "1px solid rgba(121,184,255,0.15)",
                  borderRadius: 6,
                  marginBottom: 16,
                  letterSpacing: "0.05em",
                }}
              >
                {status}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <div style={{ animation: "fadeUp 0.5s ease both" }} ref={bottomRef}>
              {result.error ? (
                <div
                  style={{
                    padding: 20,
                    background: "rgba(255,75,110,0.07)",
                    border: "1px solid rgba(255,75,110,0.25)",
                    borderRadius: 10,
                    color: "#ff8fa3",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                  }}
                >
                  ✗ Error: {result.error}
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(8,16,30,0.8)",
                    border: "1px solid rgba(121,184,255,0.2)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {/* Header bar */}
                  <div
                    style={{
                      background: "rgba(121,184,255,0.05)",
                      borderBottom: "1px solid rgba(121,184,255,0.15)",
                      padding: "12px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
                      VERIFICATION REPORT
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(121,184,255,0.1)" }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                      {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
                    </span>
                  </div>

                  <div style={{ padding: 24 }}>
                    {/* User question */}
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                        QUERY
                      </span>
                      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 4, fontStyle: "italic" }}>
                        "{result.userQuestion}"
                      </p>
                    </div>

                    {/* Verdict */}
                    <div style={{ marginBottom: 20 }}>
                      <Verdict verdict={result.verdict.verdict} />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
                          CONFIDENCE
                        </span>
                        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, maxWidth: 200 }}>
                          <div style={{
                            height: "100%",
                            borderRadius: 2,
                            width: `${result.verdict.confidence}%`,
                            background: result.verdict.verdict === "GENUINE"
                              ? "linear-gradient(90deg,#00cc7a,#00ff9d)"
                              : result.verdict.verdict === "AI_GENERATED"
                              ? "linear-gradient(90deg,#cc2244,#ff4b6e)"
                              : "linear-gradient(90deg,#cc8a30,#ffb347)",
                            transition: "width 1s ease",
                          }} />
                        </div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                          {result.verdict.confidence}%
                        </span>
                      </div>
                      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                        {result.verdict.summary}
                      </p>
                    </div>

                    {/* Mission details */}
                    {result.verdict.missionDetails && (
                      <div style={{
                        background: "rgba(0,255,157,0.04)",
                        border: "1px solid rgba(0,255,157,0.2)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20,
                      }}>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(0,255,157,0.6)", letterSpacing: "0.1em", marginBottom: 6 }}>
                          MISSION DETAILS
                        </p>
                        {result.verdict.matchedTitle && (
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#00ff9d", marginBottom: 6 }}>
                            {result.verdict.matchedTitle}
                          </p>
                        )}
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                          {result.verdict.missionDetails}
                        </p>
                        {result.verdict.matchedNasaId && (
                          <a
                            href={`https://images.nasa.gov/details/${result.verdict.matchedNasaId}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-block",
                              marginTop: 10,
                              fontFamily: "'Space Mono', monospace",
                              fontSize: 11,
                              color: "#79b8ff",
                              textDecoration: "none",
                              borderBottom: "1px dashed rgba(121,184,255,0.4)",
                              paddingBottom: 1,
                            }}
                          >
                            View on NASA.gov → {result.verdict.matchedNasaId}
                          </a>
                        )}
                      </div>
                    )}

                    {/* AI indicators */}
                    {result.verdict.aiIndicators?.length > 0 && (
                      <div style={{
                        background: "rgba(255,75,110,0.04)",
                        border: "1px solid rgba(255,75,110,0.2)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 20,
                      }}>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,75,110,0.7)", letterSpacing: "0.1em", marginBottom: 10 }}>
                          AI ARTIFACT INDICATORS
                        </p>
                        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                          {result.verdict.aiIndicators.map((ind, i) => (
                            <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ color: "#ff4b6e", flexShrink: 0 }}>▸</span>
                              {ind}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendation */}
                    {result.verdict.recommendation && (
                      <div style={{
                        background: "rgba(121,184,255,0.04)",
                        border: "1px solid rgba(121,184,255,0.15)",
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: 24,
                      }}>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(121,184,255,0.5)", letterSpacing: "0.1em", marginBottom: 6 }}>
                          RECOMMENDATION
                        </p>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                          {result.verdict.recommendation}
                        </p>
                      </div>
                    )}

                    {/* NASA Results */}
                    {result.nasaResults?.length > 0 && (
                      <div>
                        <p style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 10,
                          color: "rgba(121,184,255,0.5)",
                          letterSpacing: "0.1em",
                          marginBottom: 12,
                        }}>
                          NASA ARCHIVE MATCHES ({result.nasaResults.length} found)
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {result.nasaResults.map((item, i) => (
                            <NASACard key={i} item={item} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Divider + analysis meta */}
                    <div style={{
                      marginTop: 24,
                      paddingTop: 20,
                      borderTop: "1px solid rgba(255,255,255,0.07)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                    }}>
                      <div>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 4 }}>IMAGE TYPE</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{result.analysis.imageType?.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 4 }}>AI SUSPICION</p>
                        <p style={{ fontSize: 12, color: result.analysis.aiSuspicion === "HIGH" ? "#ff4b6e" : result.analysis.aiSuspicion === "MEDIUM" ? "#ffb347" : "#00ff9d" }}>
                          {result.analysis.aiSuspicion}
                        </p>
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: 4 }}>DESCRIPTION</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{result.analysis.description?.slice(0, 160)}…</p>
                      </div>
                    </div>

                    {/* Try again */}
                    <button
                      onClick={reset}
                      style={{
                        marginTop: 24,
                        width: "100%",
                        padding: "12px",
                        background: "transparent",
                        border: "1px dashed rgba(121,184,255,0.2)",
                        borderRadius: 8,
                        color: "rgba(121,184,255,0.5)",
                        fontSize: 13,
                        fontFamily: "'Space Mono', monospace",
                        cursor: "pointer",
                        letterSpacing: "0.08em",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = "rgba(121,184,255,0.5)";
                        e.target.style.color = "#79b8ff";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = "rgba(121,184,255,0.2)";
                        e.target.style.color = "rgba(121,184,255,0.5)";
                      }}
                    >
                      ↩ VERIFY ANOTHER IMAGE
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How it works */}
          {!result && !loading && (
            <div style={{ marginTop: 48, animation: "fadeUp 0.6s 0.3s ease both" }}>
              <p style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.15em",
                textAlign: "center",
                marginBottom: 24,
              }}>
                HOW IT WORKS
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
                {[
                  { icon: "👁️", title: "AI Vision Analysis", desc: "Claude analyzes your image for space content, artifacts, and visual cues." },
                  { icon: "🛰️", title: "NASA Archive Search", desc: "Searches NASA's free Image & Video Library API for matching images." },
                  { icon: "⚡", title: "Cross-Reference", desc: "Compares visual content against NASA records to issue a verified verdict." },
                  { icon: "📋", title: "Detailed Report", desc: "Get mission details, NASA image ID, and AI-generation indicators." },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(121,184,255,0.1)",
                    borderRadius: 10,
                    padding: 18,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#79b8ff", marginBottom: 6 }}>{s.title}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* NASA API note */}
              <div style={{
                marginTop: 24,
                padding: "12px 20px",
                background: "rgba(121,184,255,0.04)",
                border: "1px solid rgba(121,184,255,0.1)",
                borderRadius: 8,
                textAlign: "center",
              }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
                  Powered by{" "}
                  <a href="https://images.nasa.gov" target="_blank" rel="noreferrer" style={{ color: "rgba(121,184,255,0.5)", textDecoration: "none" }}>
                    NASA Image & Video Library API
                  </a>
                  {" "}· Free & open · No login required
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
