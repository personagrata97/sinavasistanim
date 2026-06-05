import { getDailyGoals } from '../src/lib/actions';
import { prisma } from '../src/lib/prisma';
async function test() {
  const goals = await getDailyGoals("bd-bilgi-sistemleri-guvenligi");
  console.log(JSON.stringify(goals, null, 2));
}
test().finally(() => prisma.$disconnect());
