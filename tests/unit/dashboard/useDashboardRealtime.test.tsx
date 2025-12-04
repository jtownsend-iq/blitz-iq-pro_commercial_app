import test from 'node:test'
import assert from 'node:assert/strict'
import { act, create } from 'react-test-renderer'
import React from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/utils/supabase/browser'

type HookEvent =
  | { type: 'event'; payload: { team_id: string; explosive: boolean | null; turnover: boolean | null } }
  | { type: 'session'; payload: { team_id: string; id: string; unit: string; status: string; started_at: string | null } }
  | { type: 'signal'; payload: { status: string; lastEventAt: string | null } }

type StoredHandler = {
  event: string
  table: string
  callback: (payload: { new?: unknown }) => void
}

test('useDashboardRealtime subscribes once and forwards events', async () => {
  const handlers: StoredHandler[] = []
  let removed = 0
  const baseChannel = {
    on: (_event: string, filter: { table: string }, callback: (payload: { new?: unknown }) => void) => {
      handlers.push({ event: _event, table: filter.table, callback })
      return channel
    },
    subscribe: () => channel,
  }
  const channel = baseChannel as unknown as Pick<RealtimeChannel, 'on' | 'subscribe'>

  const fakeClient = {
    channel: (name: string) => {
      assert.equal(name, 'dashboard-team-team-123')
      return channel
    },
    removeChannel: () => {
      removed += 1
    },
  } as unknown as ReturnType<typeof createSupabaseBrowserClient>

  const events: HookEvent[] = []
  const { useDashboardRealtime } = await import('../../../app/(app)/dashboard/hooks/useDashboardRealtime')

  const Harness = ({ teamId }: { teamId: string }) => {
    useDashboardRealtime({
      teamId,
      onEvent: (event) => events.push(event),
      clientFactory: () => fakeClient,
    })
    return null
  }

  let renderer: ReturnType<typeof create> | null = null
  await act(async () => {
    renderer = create(<Harness teamId="team-123" />)
  })

  assert.equal(handlers.length, 2)
  const eventHandler = handlers.find((h) => h.table === 'chart_events')
  const sessionHandler = handlers.find((h) => h.table === 'game_sessions')
  assert.ok(eventHandler && sessionHandler)

  act(() => {
    eventHandler?.callback({ new: { team_id: 'team-123', explosive: true, turnover: false } })
    sessionHandler?.callback({
      new: { team_id: 'team-123', id: 'sess-1', unit: 'offense', status: 'active', started_at: null },
    })
  })

  assert.equal(events.length, 3) // event + session + signal
  assert.equal(events[0].type, 'event')
  assert.equal(events[1].type, 'session')

  await act(async () => {
    renderer?.unmount()
  })
  assert.equal(removed, 1)
})
