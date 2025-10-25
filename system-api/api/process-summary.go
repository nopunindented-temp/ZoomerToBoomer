package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/go-resty/resty/v2"
)

// Structs same as before
type Conversation struct {
	Text       string `json:"text"`
	Generation string `json:"generation"`
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

// This replaces main(): Vercel looks for this function
func Handler(w http.ResponseWriter, r *http.Request) {
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

		Your goal is to explain unfamiliar slang, idioms, or generational expressions from either older or younger speakers.

		Rules:
		- Detect slang, idioms, or phrases that might be unfamiliar to the listener's generation.
		- If the listener is Gen Alpha:
		• Keep explanations extremely simple and short (1 short sentence).
		• Use easy, kid-friendly words.
		• Never mention origin, culture, or history.
		• Sound natural, friendly, and clear.
		- For other generations, keep responses concise (1–2 short sentences max) and straightforward.
		- Avoid rare words, extra punctuation, or over-explaining.
		- You may use the browser_search tool to confirm unclear or very new phrases.
		- Always return valid JSON in this exact format:
		{
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
		{"groq/compound", true},
		{"groq/compound-mini", true},
		{"groq/compound", false},
		{"groq/compound-mini", false},
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
