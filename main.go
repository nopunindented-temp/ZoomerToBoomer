package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/joho/godotenv"
	"os"

	"github.com/nopunindented-temp/ZoomerToBoomer/system_api/api" // update path if needed
)

func main() {
	// Load environment variables from .env
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("⚠️  No .env file found — proceeding with system environment vars.")
	}

	// Verify Groq key exists
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		log.Fatal("❌ Missing GROQ_API_KEY — please set it in your .env file.")
	}

	// Register endpoint
	http.HandleFunc("/process-summary", handler.Handler)

	port := "8080"
	fmt.Printf("🚀 Local Spectacles API running at http://localhost:%s/process-summary\n", port)
	fmt.Println("Press Ctrl+C to stop.")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
