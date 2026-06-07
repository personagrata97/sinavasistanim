import { validateQuestionsWithSolver } from "./src/lib/ai-service";

async function run() {
  const q = [{
    question: "Test question",
    options: ["A) 1", "B) 2"],
    correctOption: "A) 1",
    explanation: "Because"
  }];
  const res = await validateQuestionsWithSolver("Notes here. The answer is A) 1.", q);
  console.log("Result:", res);
}
run().catch(console.error);
