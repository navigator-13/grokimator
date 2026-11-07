import { describe, expect, it } from 'vitest'
import { BotEngine } from './engine'
import { HOUSE_CONTOUR, HOUSE_RADII, SHAPE_BY_ID } from './skins'

describe('STR Host house avatar', () => {
  it('keeps the exact concave house outline and eight window panes at rest', () => {
    expect(HOUSE_CONTOUR).toHaveLength(64)
    const frame = new BotEngine(100, 'idle', HOUSE_RADII).sample(0)
    const circle = new BotEngine(100, 'idle').sample(0)
    expect(frame.bodyPath).not.toBe(circle.bodyPath)
    expect(frame.houseWindowsAlpha).toBe(1)
    expect((frame.houseWindowsPath.match(/M/g) ?? []).length).toBe(8)
    expect(frame.houseWindowsBlink).toBe(1)
  })

  it('uses the native blink schedule for the four-pane windows', () => {
    const engine = new BotEngine(100, 'idle', HOUSE_RADII)
    expect(engine.sample(1).houseWindowsBlink).toBe(1)
    expect(engine.sample(1.48).houseWindowsBlink).toBeLessThan(1)
    expect(engine.sample(1.8).houseWindowsBlink).toBe(1)
  })

  it('morphs to the original animated states and back without changing their timing', () => {
    const engine = new BotEngine(100, 'idle', HOUSE_RADII)
    engine.setState('thinking', 2)
    expect(engine.sample(2).houseWindowsAlpha).toBe(1)
    const mid = engine.sample(2.2)
    expect(mid.houseWindowsAlpha).toBeGreaterThan(0)
    expect(mid.houseWindowsAlpha).toBeLessThan(1)
    expect(engine.sample(2.5).houseWindowsAlpha).toBe(0)
    engine.setState('idle', 4)
    expect(engine.sample(4.5).houseWindowsAlpha).toBe(1)
  })

  it('morphs the custom contour to a catalogue radial shape', () => {
    const engine = new BotEngine(100, 'idle', HOUSE_RADII)
    const start = engine.sample(1).bodyPath
    engine.setShape(SHAPE_BY_ID.get('cercle')!.radii, 1)
    expect(engine.sample(1).bodyPath).toBe(start)
    expect(engine.sample(1.5).bodyPath).not.toBe(start)
    expect(engine.sample(1.5).houseWindowsAlpha).toBe(0)
  })
})
