package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
	"github.com/joho/godotenv"
)

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

func main() {
	_ = godotenv.Load()
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		log.Fatal("Missing GROQ_API_KEY in .env")
	}

	router := gin.Default()

	router.POST("/process-summary", func(c *gin.Context) {
		var convo Conversation
		if err := c.BindJSON(&convo); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
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

		type attempt struct {
			Model     string
			WithTools bool
		}
		attempts := []attempt{
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
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Groq response"})
					return
				}
				if len(gr.Choices) == 0 {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "No response from Groq"})
					return
				}
				c.JSON(http.StatusOK, gin.H{
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
				c.Data(resp.StatusCode(), "application/json", resp.Body())
				return
			}
		}

		c.JSON(http.StatusBadGateway, gin.H{
			"error":       "No available model or configuration worked.",
			"last_error":  trim(lastErrBody, 1500),
			"suggestion":  "Ensure your Groq org has access to 'groq/compound' or 'groq/compound-mini' models for browser_search tool use.",
		})
	})

	fmt.Println("system_api (Groq + browser_search + generation-aware slang detection) running at http://localhost:8080")
	router.Run(":8080")
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
		if strings.Contains(msg, "tools") ||
			strings.Contains(msg, "unsupported") ||
			strings.Contains(msg, "must be one of [function, mcp]") {
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
