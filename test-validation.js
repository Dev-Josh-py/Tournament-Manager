const { z } = require("zod");

const schema = z.array(z.object({
  teamId: z.number(),
  teamName: z.string(),
  teamColor: z.string(),
  totalPoints: z.number(),
  rank: z.number(),
}));

const data = [
  {"teamId":1,"teamName":"Team Josh/Jethro","teamColor":"#ef4444","totalPoints":18,"rank":1},
  {"teamId":3,"teamName":"Team Ross/Jaun","teamColor":"#22c55e","totalPoints":7,"rank":2},
  {"teamId":2,"teamName":"Team Keagan/Matt","teamColor":"#3b82f6","totalPoints":6,"rank":3}
];

try {
  const result = schema.parse(data);
  console.log("✅ Validation passed");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.log("❌ Validation failed:", error.message);
}
