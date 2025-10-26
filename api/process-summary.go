package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"github.com/joho/godotenv"
	"github.com/go-resty/resty/v2"
)

// === Structs ===
type Conversation struct {
	Text       string `json:"text"`
	Generation string `json:"generation"`
}


func init() {
    _ = godotenv.Load()
}

type GroqResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Choices []struct {
		Index        int    `json:"index"`
		FinishReason string `json:"finish_reason"`
		Message      struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type GroqError struct {
	Error struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error"`
}

// === Handler (Vercel entrypoint) ===
func Handler(w http.ResponseWriter, r *http.Request) {
	// ✅ Always set CORS headers for every request
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Max-Age", "86400")

	// ✅ Handle preflight OPTIONS requests
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Only POST supported", http.StatusMethodNotAllowed)
		return
	}

	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		http.Error(w, "Missing GROQ_API_KEY", http.StatusInternalServerError)
		return
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	var convo Conversation
	if err := json.Unmarshal(bodyBytes, &convo); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	systemPrompt := fmt.Sprintf(`
	You are the Spectacles Agentic assistant.
	The listener belongs to the %s generation.

	Generational hierarchy (youngest → oldest):
	Gen Alpha (2013–2025)
	→ Gen Z (1997–2012)
	→ Millennial / Gen Y (1981–1996)
	→ Gen X (1965–1980)
	→ Baby Boomer (1946–1964)

	Your role is to explain slang or idioms only when there is a genuine cross-generational gap of two or more steps.

	Behavior rules:
	- Always infer which generation the *speaker* likely belongs to based on the slang or tone.
	- Some slang originates in one generation (e.g. Gen Z) but becomes actively used by the next (e.g. Gen Alpha). 
	In those cases, treat the slang as **belonging to both generations**. 
	Example: “rizz”, “fit goes hard”, and “no cap” are used by both Gen Z and Gen Alpha → do not flag them as cross-generational.
	- Compute the generational gap (absolute difference in list order):
	• Gap ≤ 1 → DO NOT explain; assume mutual understanding.
	• Gap ≥ 2 → explain slang, idioms, or cultural expressions that are likely unfamiliar.
	- Over-explaining or clarifying within a 1-generation gap is considered an error.
	- Ignore literal, common, or dictionary words (e.g. “slang”, “honestly”, “stupid”, “literally”).
	- For Gen Alpha listeners, use very simple, single-sentence explanations.
	- Output clean JSON:

	{
	"speaker_generation": "<guessed generation>",
	"generational_gap": "<integer difference>",
	"slang_explanations": {
		"<term>": "<concise meaning>"
	},
	"action": "<suggested_action>",
	"reason": "<brief_reason>"
	}
	`, convo.Generation)

	client := resty.New()
	client.SetHeader("Content-Type", "application/json")
	client.SetAuthToken(apiKey)

	attempts := []struct {
	Model     string
	WithTools bool
	}{
		{"llama-3.3-70b-versatile", false},
		{"llama-3.3-8b-instant", false},
	}

	var lastErrBody string
	for _, a := range attempts {
		reqBody := buildRequestBody(systemPrompt, convo.Text, a.Model, a.WithTools)
		resp, err := client.R().
			SetBody(reqBody).
			Post("https://api.groq.com/openai/v1/chat/completions")

		if err != nil {
			lastErrBody = err.Error()
			continue
		}

		if resp.StatusCode() == 200 {
			var gr GroqResponse
			if err := json.Unmarshal(resp.Body(), &gr); err != nil {
				http.Error(w, "Failed to parse Groq response", 500)
				return
			}
			if len(gr.Choices) == 0 {
				http.Error(w, "No response from Groq", 500)
				return
			}

			// ✅ CORS-safe successful response
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"model_used": a.Model,
				"tools_used": a.WithTools,
				"result":     gr.Choices[0].Message.Content,
			})
			return
		}

		lastErrBody = string(resp.Body())
		if shouldRetryWithNextModel(resp.StatusCode(), resp.Body()) {
			continue
		} else {
			w.WriteHeader(resp.StatusCode())
			w.Write(resp.Body())
			return
		}
	}

	http.Error(w, "No model worked: "+trim(lastErrBody, 500), http.StatusBadGateway)
}

// === Helper functions ===
func buildRequestBody(systemPrompt, userText, model string, withTools bool) map[string]interface{} {
	msgs := []map[string]string{
		{"role": "system", "content": systemPrompt},
		{"role": "user", "content": userText},
	}
	req := map[string]interface{}{
		"model":       model,
		"messages":    msgs,
		"temperature": 0.2,
		"max_tokens":  4000,
	}
	if withTools {
		req["tool_choice"] = "auto"
		req["tools"] = []map[string]interface{}{
			{"type": "browser_search"},
		}
	}
	return req
}

func shouldRetryWithNextModel(status int, body []byte) bool {
	if status == 404 || status == 400 || status == 422 || status == 409 {
		var ge GroqError
		_ = json.Unmarshal(body, &ge)
		msg := strings.ToLower(ge.Error.Message)
		code := strings.ToLower(ge.Error.Code)
		if strings.Contains(code, "model_not_found") || strings.Contains(code, "model_decommissioned") {
			return true
		}
		if strings.Contains(msg, "tools") || strings.Contains(msg, "unsupported") {
			return true
		}
	}
	return false
}

func trim(s string, n int) string {
	b := []byte(s)
	if len(b) <= n {
		return s
	}
	return string(bytes.TrimSpace(b[:n]))
}

// Add this at the bottom of your file — temporarily for local testing only.
func main() {
    port := "8080"
    fmt.Println("🚀 Running local API on http://localhost:" + port)
    http.HandleFunc("/process-summary", Handler)
    http.ListenAndServe(":"+port, nil)
}
