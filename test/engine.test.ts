import { describe, it, expect } from 'vitest';
import { GridSimulationEngine, LevelDefinition, ActionOpcode } from '../src/index.js';

describe('GridSimulationEngine', () => {
  const testLevel: LevelDefinition = {
    id: 'level-1',
    width: 5,
    height: 5,
    start: { x: 0, y: 0 },
    startDirection: 'EAST',
    target: { x: 2, y: 0 },
    obstacles: [{ x: 1, y: 1 }],
    maxSteps: 10,
  };

  it('navigates straight to target successfully', () => {
    const engine = new GridSimulationEngine(testLevel);
    const actions: ActionOpcode[] = [
      { type: 'MOVE_FORWARD' },
      { type: 'MOVE_FORWARD' },
    ];

    const result = engine.run(actions);
    expect(result.success).toBe(true);
    expect(result.finalStatus).toBe('SUCCESS');
    expect(result.totalSteps).toBe(2);
    expect(result.trace[result.trace.length - 1]?.car).toEqual({ x: 2, y: 0 });
  });

  it('detects boundary out-of-bounds on wall run', () => {
    const engine = new GridSimulationEngine(testLevel);
    // Face North and move: immediate out-of-bounds (y: -1)
    const actions: ActionOpcode[] = [
      { type: 'TURN_LEFT' },
      { type: 'MOVE_FORWARD' },
    ];

    const result = engine.run(actions);
    expect(result.success).toBe(false);
    expect(result.finalStatus).toBe('OUT_OF_BOUNDS');
  });

  it('detects collision with obstacle', () => {
    const engine = new GridSimulationEngine(testLevel);
    // Move to (1,0) -> Turn Right to face South -> Move to (1,1) [Obstacle]
    const actions: ActionOpcode[] = [
      { type: 'MOVE_FORWARD' },
      { type: 'TURN_RIGHT' },
      { type: 'MOVE_FORWARD' },
    ];

    const result = engine.run(actions);
    expect(result.success).toBe(false);
    expect(result.finalStatus).toBe('COLLISION');
  });

  it('fails with STEP_LIMIT_EXCEEDED when maxSteps is breached', () => {
    const engine = new GridSimulationEngine({ ...testLevel, maxSteps: 2 });
    const actions: ActionOpcode[] = [
      { type: 'TURN_RIGHT' },
      { type: 'TURN_RIGHT' },
      { type: 'TURN_RIGHT' },
    ];

    const result = engine.run(actions);
    expect(result.success).toBe(false);
    expect(result.finalStatus).toBe('STEP_LIMIT_EXCEEDED');
  });
});