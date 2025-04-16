"use client";

import { useState } from "react";
import { format } from "date-fns"; 
import { useRouter } from "next/navigation"; 
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import QuizResult from "./quiz-result"; 

// QuizList component receives an array of assessments (quiz history)
export default function QuizList({ assessments }) {
  const router = useRouter(); // Router hook to navigate programmatically
  const [selectedQuiz, setSelectedQuiz] = useState(null); // State to hold the quiz selected for detailed view

  return (
    <>
      {/* Card that wraps the quiz list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* Title and description on the left */}
            <div>
              <CardTitle className="gradient-title text-3xl md:text-4xl">
                Recent Quizzes
              </CardTitle>
              <CardDescription>
                Review your past quiz performance
              </CardDescription>
            </div>

            {/* Button to start a new quiz */}
            <Button onClick={() => router.push("/interview/mock")}>
              Start New Quiz
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Render each assessment as a clickable Card */}
            {assessments?.map((assessment, i) => (
              <Card
                key={assessment.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedQuiz(assessment)} // Open detailed modal on click
              >
                <CardHeader>
                  {/* Quiz number title */}
                  <CardTitle className="gradient-title text-2xl">
                    Quiz {i + 1}
                  </CardTitle>

                  {/* Score and timestamp */}
                  <CardDescription className="flex justify-between w-full">
                    <div>Score: {assessment.quizScore.toFixed(1)}%</div>
                    <div>
                      {format(
                        new Date(assessment.createdAt),
                        "MMMM dd, yyyy HH:mm"
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>

                {/* Show improvement tip if it exists */}
                {assessment.improvementTip && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {assessment.improvementTip}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal (Dialog) to show full quiz result when one is selected */}
      <Dialog open={!!selectedQuiz} onOpenChange={() => setSelectedQuiz(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>

          {/* Render quiz result in modal */}
          <QuizResult
            result={selectedQuiz}
            hideStartNew // Prevents showing "Start New Quiz" button again in the modal
            onStartNew={() => router.push("/interview/mock")} // Redundant, but passed for reuse
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
