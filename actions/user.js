"use server"; // This makes the file a Server Action in Next.js 13+

import { auth } from "@clerk/nextjs/server"; // Clerk authentication to get user ID
import { db } from "@/lib/prisma"; // Prisma client for database operations

// Function to update user profile and ensure industry insights exist
export async function updateUser(data) {
  // Get the authenticated user's ID
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized"); // Throw error if user is not logged in

  // Find the user in the database using Clerk user ID
  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });
  if (!user) throw new Error("User not found"); // Throw error if user does not exist in DB

  try {
    // Start a Prisma transaction to ensure atomicity of operations
    const result = await db.$transaction(
      async (tx) => {
        // Step 1: Check if the selected industry already exists in industryInsight table
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // Step 2: If industry doesn't exist, create it with default placeholder values
        if (!industryInsight) {
          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              salaryRanges: [], // Default empty array
              growthRate: 0, // Default zero growth
              demandLevel: "MEDIUM", // Default medium demand
              topSkills: [], // No top skills yet
              marketOutlook: "NEUTRAL", // Default outlook
              keyTrends: [], // Default trends
              recommendedSkills: [], // Default recommended skills
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next update in 7 days
            },
          });
        }

        // Step 3: Update the user's profile in the user table
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        // Return both updated user and the industry insight
        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000, // Optional: fail if it takes more than 10 seconds
      }
    );

    // Return the updated user from the transaction result
    return {success : true, ...result}; 
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile"); // Generic error message
  }
}

// Function to check if the user has completed onboarding
export async function getUserOnboardingStatus() {
  const { userId } = await auth(); // Get the current user's ID
  if (!userId) throw new Error("Unauthorized"); // If not logged in, throw error

  // Fetch the user to verify they exist in the DB
  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });
  if (!user) throw new Error("User not found");

  try {
    // Check if the user has selected an industry (indicates onboarding complete)
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true, // Only fetch industry field
      },
    });

    return {
      isOnboarded: !!user?.industry, // If industry exists, user is onboarded
    };
  } catch (error) {
    console.error("Error fetching user onboarding status:", error.message);
    throw new Error("Failed to fetch onboarding status");
  }
}
