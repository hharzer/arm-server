import request from 'supertest'

import { App } from '@/app'
import { knex, Relation } from '@/db'
import { Source } from './ids'

let id = 0
const createRelations = async <N extends number>(
  amount: N
): Promise<N extends 1 ? Relation : Relation[]> => {
  const relations: Relation[] = Array.from({ length: amount }).map(() => {
    const r = {
      anilist: id,
      anidb: id + 1,
      kitsu: id + 2,
      myanimelist: id + 3,
    }

    id += 4

    return r
  })

  await knex.insert(relations).into('relations')

  if (amount === 1) {
    return relations[0] as any
  }

  return relations as any
}

const server = App.listen()

afterAll(() => {
  server.close()
})

afterEach(() => knex.delete().from('relations'))

describe('single', () => {
  test('fetches relation correctly', async () => {
    const relation = await createRelations(1)

    return request(server)
      .get('/api/ids')
      .query({
        source: Source.ANILIST,
        id: relation.anilist,
      })
      .expect(200, relation)
      .expect('Content-Type', /json/)
  })

  test("returns 404 when id doesn't exist", async () =>
    request(server)
      .get('/api/ids')
      .query({
        source: Source.KITSU,
        id: 404,
      })
      .expect(404, {
        code: 404,
        error: 'NotFound',
        messages: ['Could not find any entries with the provided filters.'],
      })
      .expect('Content-Type', /json/))
})

describe('multiple', () => {
  test('fetches relations correctly', async () => {
    const relations = await createRelations(4)

    const body = [
      { source: Source.ANIDB, id: relations[0].anidb },
      { source: Source.ANILIST, id: 1000 },
      { source: Source.KITSU, id: relations[2].kitsu },
    ]

    const result = [relations[0], null, relations[2]]

    return request(server)
      .get('/api/ids')
      .send(body)
      .expect(result)
      .expect('Content-Type', /json/)
  })

  test('responds correctly on no finds', async () => {
    const body = [
      { source: Source.ANILIST, id: 1000 },
      { source: Source.KITSU, id: 1000 },
    ]

    const result = [null, null]

    return request(server)
      .get('/api/ids')
      .send(body)
      .expect(result)
      .expect('Content-Type', /json/)
  })
})
