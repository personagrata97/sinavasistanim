import { prisma } from "../src/lib/prisma"
import { getCourseBySlug } from "../src/lib/actions"

async function test() {
  console.log("Checking database directly...")
  const courseDirect = await prisma.course.findUnique({
    where: { slug: "bd-bilgi-sistemleri-guvenligi" },
    include: { program: true }
  })
  console.log("Direct findUnique result:", courseDirect ? { id: courseDirect.id, slug: courseDirect.slug, program: courseDirect.program?.slug } : null)

  console.log("Checking getCourseBySlug action...")
  const courseAction = await getCourseBySlug("bd-bilgi-sistemleri-guvenligi")
  console.log("Action result:", courseAction ? { id: courseAction.id, slug: courseAction.slug } : null)
}

test().catch(console.error)
