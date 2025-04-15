// Import the Prisma database client
import { db } from "@/lib/prisma";

// Import the Inngest client to schedule and run background tasks
import { inngest } from "./client";

// Import Google Generative AI SDK (Gemini)
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Generative AI client using your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Load the specific model you'd like to use (gemini-1.5-flash is fast and capable)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Inngest Function: Runs every Sunday at midnight
 * Purpose: Automatically update industry insights for all tracked industries
 */
export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" }, // Name shown in Inngest dashboard
  { cron: "0 0 * * 0" }, // Cron schedule: Sunday at 00:00 (midnight)
  async ({ event, step }) => {
    // Step 1: Fetch the list of industries that already exist in the database
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true }, // Only fetch industry name (not full record)
      });
    });

    // Step 2: Loop through each industry and generate updated insights using Gemini
    for (const { industry } of industries) {
      // Define the prompt that will be sent to Gemini
      const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }

          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

      // Step 3: Use Gemini AI to generate content based on the prompt
      const res = await step.ai.wrap(
        "gemini", // Label for step (shown in Inngest UI)
        async (p) => {
          return await model.generateContent(p); // Generate content with Gemini
        },
        prompt // Prompt passed to Gemini
      );

      // Step 4: Extract raw text content from Gemini's response
      const text = res.response.candidates[0].content.parts[0].text || "";

      // Step 5: Clean the response text (remove backticks or markdown formatting)
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      // Step 6: Parse the cleaned JSON string into a JavaScript object
      const insights = JSON.parse(cleanedText);

      // Step 7: Update the `industryInsight` record in the database
      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry }, // Match by industry name
          data: {
            ...insights, // Spread all AI-generated insights directly
            demandLevel: insights.demandLevel?.toUpperCase(), // Convert "High" → "HIGH"
            marketOutlook: insights.marketOutlook?.toUpperCase(), // Convert "Positive" → "POSITIVE"
            lastUpdated: new Date(), // Set the current time as last updated
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next update: 7 days later
          },
        });
      });
    }
  }
);
