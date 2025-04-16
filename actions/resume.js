"use server"; // This directive ensures the file runs in a server-side environment in Next.js App Router

// Imports
import { db } from "@/lib/prisma"; // Prisma client for database operations
import { auth } from "@clerk/nextjs/server"; // Clerk authentication for getting the logged-in user
import { GoogleGenerativeAI } from "@google/generative-ai"; // Google Gemini API for AI-assisted resume improvements
import { revalidatePath } from "next/cache"; // Next.js cache revalidation function to refresh pages after data mutation

// Initialize Gemini model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Saves or updates a resume for the authenticated user.
 * Uses Prisma's `upsert` to either create or update the resume content.
 */
export async function saveResume(content) {
  const { userId } = await auth(); // Get the currently logged-in Clerk user
  if (!userId) throw new Error("Unauthorized"); // If not logged in, throw an error

  // Fetch the corresponding user record from the local database
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found"); // Ensure the user exists in your database

  try {
    // Upsert (update if exists, otherwise create) resume data
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    // Invalidate the "/resume" path so it reflects updated content immediately
    revalidatePath("/resume");

    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

/**
 * Retrieves the resume for the authenticated user from the database.
 */
export async function getResume() {
  const { userId } = await auth(); // Get the Clerk user ID
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Fetch the resume linked to the user
  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

/**
 * Improves a section of the resume using Gemini AI.
 * @param current - The current text (job/summary/etc.)
 * @param type - The type of section (e.g., experience, summary)
 */
export async function improveWithAI({
  current,
  type,
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user with their industry information (used in the AI prompt)
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true, // Optional relation, depending on how your DB is structured
    },
  });

  if (!user) throw new Error("User not found");

  // Custom prompt for Gemini AI to improve resume content
  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    
    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    // Send the prompt to Gemini and get the improved content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const improvedContent = response.text().trim();

    return improvedContent;
  } catch (error) {
    console.error("Error improving content:", error);
    throw new Error("Failed to improve content");
  }
}
