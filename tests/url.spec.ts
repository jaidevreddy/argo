import { describe, expect, test } from 'vitest'
import { readUrl } from '../src/state/urlSync'

describe('URL scenario parsing', () => {
  test('site + time', () => {
    const r = readUrl('?site=im-1&t=2024-02-22T23:23:53Z')
    expect(r.target).toEqual({ kind: 'site', id: 'im-1' })
    expect(r.utcMs).toBe(Date.parse('2024-02-22T23:23:53Z'))
  })
  test('custom coordinates and hardware', () => {
    const r = readUrl('?lat=-89.4&lon=-136.2&mast=10&panel=flat&mask=5')
    expect(r.target).toEqual({ kind: 'custom', lat: -89.4, lon: -136.2 })
    expect(r).toMatchObject({ mastM: 10, panel: 'flat', maskDeg: 5 })
  })
  test('rejects junk', () => {
    const r = readUrl('?site=<script>&lat=200&lon=0&t=nope&mast=-3&panel=x&mask=99')
    expect(r).toEqual({})
  })
})
