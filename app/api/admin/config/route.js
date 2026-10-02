import { isAdmin } from '../../../../lib/auth'
import { readConfig, writeConfig, validate } from '../../../../lib/config'

const no = () => Response.json({ error: 'Not signed in' }, { status: 401 })

export async function GET() {
  if (!(await isAdmin())) return no()
  return Response.json(readConfig())
}

export async function PUT(req) {
  if (!(await isAdmin())) return no()
  try {
    const clean = validate(await req.json())
    writeConfig(clean)
    return Response.json(clean)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
