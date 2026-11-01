import { describe, it, expect } from 'vitest';
import { GridSimulationEngine, LevelDefinition, ActionOpcode } from '../src/index.js';

const baseLevel: LevelDefinition = {
  id: 'level-1',
  width: 5,
  height: 5,
  start: { x: 0, y: 0 },
  startDirection: 'EAST',
  target: { x: 2, y: 0 },
  obstacles: [{ x: 1, y: 1 }],
  maxBlocks: null,
  maxSteps: 10,
};

describe('GridSimulationEngine', () => {
  describe('Phase 1 - navigation & success', () => {
    it('navigates straight to target successfully', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const actions: ActionOpcode[] = [{ type: 'MOVE_FORWARD' }, { type: 'MOVE_FORWARD' }];

      const result = engine.run(actions);
      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('SUCCESS');
      expect(result.totalSteps).toBe(2);
      expect(result.trace[result.trace.length - 1]?.car).toEqual({ x: 2, y: 0 });
    });

    it('returns TERMINATED_WITHOUT_TARGET when actions run out short of goal', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([{ type: 'MOVE_FORWARD' }]);
      expect(result.success).toBe(false);
      expect(result.finalStatus).toBe('TERMINATED_WITHOUT_TARGET');
      expect(result.totalSteps).toBe(1);
    });

    it('always seeds the trace with a step-0 initial snapshot', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([{ type: 'MOVE_FORWARD' }]);
      expect(result.trace[0]).toMatchObject({
        stepNumber: 0,
        car: { x: 0, y: 0 },
        direction: 'EAST',
        status: 'RUNNING',
      });
    });
  });

  describe('Phase 1 - movement hazards', () => {
    it('detects boundary out-of-bounds on a north wall run', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([{ type: 'TURN_LEFT' }, { type: 'MOVE_FORWARD' }]);
      expect(result.success).toBe(false);
      expect(result.finalStatus).toBe('OUT_OF_BOUNDS');
      // The snapshot captures the attempted (out-of-bounds) position.
      const last = result.trace[result.trace.length - 1];
      expect(last?.car).toEqual({ x: 0, y: -1 });
    });

    it('detects out-of-bounds on the far east edge', () => {
      const level: LevelDefinition = {
        ...baseLevel,
        start: { x: 4, y: 0 },
        target: { x: 0, y: 0 },
      };
      const engine = new GridSimulationEngine(level);
      const result = engine.run([{ type: 'MOVE_FORWARD' }]);
      expect(result.finalStatus).toBe('OUT_OF_BOUNDS');
      expect(result.trace[result.trace.length - 1]?.car).toEqual({ x: 5, y: 0 });
    });

    it('detects collision with obstacle', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([
        { type: 'MOVE_FORWARD' }, // to (1,0)
        { type: 'TURN_RIGHT' }, // face SOUTH
        { type: 'MOVE_FORWARD' }, // (1,1) is an obstacle
      ]);
      expect(result.success).toBe(false);
      expect(result.finalStatus).toBe('COLLISION');
      // Collision snapshot records the attempted cell (1,1).
      expect(result.trace[result.trace.length - 1]?.car).toEqual({ x: 1, y: 1 });
    });

    it('fails with STEP_LIMIT_EXCEEDED when maxSteps is breached', () => {
      const engine = new GridSimulationEngine({ ...baseLevel, maxSteps: 2 });
      const result = engine.run([
        { type: 'TURN_RIGHT' },
        { type: 'TURN_RIGHT' },
        { type: 'TURN_RIGHT' },
      ]);
      expect(result.success).toBe(false);
      expect(result.finalStatus).toBe('STEP_LIMIT_EXCEEDED');
      expect(result.totalSteps).toBe(3);
    });

    it('does not exceed the step limit when exactly at the limit', () => {
      const engine = new GridSimulationEngine({ ...baseLevel, maxSteps: 2 });
      const result = engine.run([{ type: 'TURN_RIGHT' }, { type: 'TURN_RIGHT' }]);
      expect(result.finalStatus).toBe('TERMINATED_WITHOUT_TARGET');
    });
  });

  describe('rotation', () => {
    it('turnLeft rotates counter-clockwise (EAST -> NORTH -> WEST)', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([{ type: 'TURN_LEFT' }, { type: 'TURN_LEFT' }]);
      expect(result.trace[1].direction).toBe('NORTH');
      expect(result.trace[2].direction).toBe('WEST');
    });

    it('four right turns return to the original heading', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([
        { type: 'TURN_RIGHT' },
        { type: 'TURN_RIGHT' },
        { type: 'TURN_RIGHT' },
        { type: 'TURN_RIGHT' },
      ]);
      expect(result.trace[result.trace.length - 1]?.direction).toBe('EAST');
    });
  });

  describe('Phase 2 - battery', () => {
    const batteryLevel: LevelDefinition = {
      id: 'p2-battery',
      width: 4,
      height: 1,
      start: { x: 0, y: 0 },
      startDirection: 'EAST',
      target: { x: 3, y: 0 },
      obstacles: [],
      maxBlocks: null,
      maxSteps: 10,
      initialBattery: 10,
      // Cost charged for the cell you are LEAVING.
      b_costs: [[0, 5, 5, 0]],
    };

    it('deducts battery for the exit cell on each move', () => {
      const engine = new GridSimulationEngine(batteryLevel);
      const result = engine.run([
        { type: 'MOVE_FORWARD' },
        { type: 'MOVE_FORWARD' },
        { type: 'MOVE_FORWARD' },
      ]);
      expect(result.finalStatus).toBe('SUCCESS');
      // Left cells 0,1,2 => costs 0,5,5 => battery 10-10 = 0
      expect(result.trace[result.trace.length - 1]?.battery).toBe(0);
    });

    it('fails with BATTERY_DEPLETED when battery drops below zero', () => {
      // Leaves cell 0 (cost 0), then cell 1 (cost 5) => 4 - 5 = -1.
      const engine = new GridSimulationEngine({ ...batteryLevel, initialBattery: 4 });
      const result = engine.run([{ type: 'MOVE_FORWARD' }, { type: 'MOVE_FORWARD' }]);
      expect(result.finalStatus).toBe('BATTERY_DEPLETED');
      expect(result.success).toBe(false);
    });

    it('reports hasVipParcel only when a vipParcel exists on the level', () => {
      const engine = new GridSimulationEngine({
        ...batteryLevel,
        vipParcel: { x: 2, y: 0 },
      });
      const result = engine.run([{ type: 'PICKUP' }, { type: 'MOVE_FORWARD' }]);
      expect(result.trace.every((s) => s.hasVipParcel !== undefined)).toBe(true);
    });

    // Regression guard for "deduct block cost before moving": on a move the
    // cost charged must be for the cell being LEFT, not the destination. Here
    // the source (cell 0) is costly while every destination is free, so an
    // implementation that charged the destination would charge 0 instead.
    it('charges the cost of the cell being left, not the destination', () => {
      const level: LevelDefinition = {
        id: 'source-cost',
        width: 3,
        height: 1,
        start: { x: 0, y: 0 },
        startDirection: 'EAST',
        target: { x: 2, y: 0 },
        obstacles: [],
        maxBlocks: null,
        maxSteps: 10,
        initialBattery: 10,
        // Cell 0 costs 4; cells 1 and 2 are free.
        b_costs: [[4, 0, 0]],
      };
      const engine = new GridSimulationEngine(level);
      const result = engine.run([{ type: 'MOVE_FORWARD' }, { type: 'MOVE_FORWARD' }]);
      expect(result.finalStatus).toBe('SUCCESS');
      // Only leaving cell 0 (cost 4) is charged => 10 - 4 = 6.
      expect(result.trace[result.trace.length - 1]?.battery).toBe(6);
    });
  });

  describe('Phase 2 - time', () => {
    const timeLevel: LevelDefinition = {
      id: 'p2-time',
      width: 4,
      height: 1,
      start: { x: 0, y: 0 },
      startDirection: 'EAST',
      target: { x: 3, y: 0 },
      obstacles: [],
      maxBlocks: null,
      maxSteps: 10,
      initialTime: 10,
      t_costs: [[0, 5, 5, 0]],
    };

    it('deducts time for the exit cell on each move', () => {
      const engine = new GridSimulationEngine(timeLevel);
      const result = engine.run([
        { type: 'MOVE_FORWARD' },
        { type: 'MOVE_FORWARD' },
        { type: 'MOVE_FORWARD' },
      ]);
      expect(result.finalStatus).toBe('SUCCESS');
      expect(result.trace[result.trace.length - 1]?.time).toBe(0);
    });

    it('fails with TIME_DEPLETED when time drops below zero', () => {
      // Leaving cell 0 costs 5 time; starting with 3 => -2.
      const engine = new GridSimulationEngine({
        ...timeLevel,
        initialTime: 3,
        t_costs: [[5, 5, 5, 0]],
      });
      const result = engine.run([{ type: 'MOVE_FORWARD' }]);
      expect(result.finalStatus).toBe('TIME_DEPLETED');
    });
  });

  describe('Phase 2 - recharge & VIP parcel', () => {
    it('RECHARGE restores battery to initialBattery and costs 10 time', () => {
      const level: LevelDefinition = {
        id: 'recharge',
        width: 4,
        height: 1,
        start: { x: 0, y: 0 },
        startDirection: 'EAST',
        target: { x: 3, y: 0 },
        obstacles: [],
        maxBlocks: null,
        maxSteps: 10,
        initialBattery: 10,
        initialTime: 100,
        b_costs: [[0, 5, 5, 0]],
        t_costs: [[0, 0, 0, 0]],
      };
      const engine = new GridSimulationEngine(level);
      const result = engine.run([{ type: 'MOVE_FORWARD' }, { type: 'RECHARGE' }]);
      const rechargeFrame = result.trace[2];
      expect(rechargeFrame.battery).toBe(10);
      expect(rechargeFrame.time).toBe(90);
    });

    it('VIP parcel lets the drone pass through an obstacle after pickup', () => {
      const level: LevelDefinition = {
        id: 'vip-bypass',
        width: 4,
        height: 1,
        start: { x: 0, y: 0 },
        startDirection: 'EAST',
        target: { x: 3, y: 0 },
        obstacles: [{ x: 1, y: 0 }],
        maxBlocks: null,
        maxSteps: 10,
        vipParcel: { x: 0, y: 0 },
      };
      const engine = new GridSimulationEngine(level);
      const result = engine.run([
        { type: 'PICKUP' }, // grab VIP at start
        { type: 'MOVE_FORWARD' }, // through obstacle at (1,0)
        { type: 'MOVE_FORWARD' },
        { type: 'MOVE_FORWARD' },
      ]);
      expect(result.finalStatus).toBe('SUCCESS');
    });

    it('without the VIP parcel the obstacle blocks movement', () => {
      const level: LevelDefinition = {
        id: 'no-vip',
        width: 4,
        height: 1,
        start: { x: 0, y: 0 },
        startDirection: 'EAST',
        target: { x: 3, y: 0 },
        obstacles: [{ x: 1, y: 0 }],
        maxBlocks: null,
        maxSteps: 10,
      };
      const engine = new GridSimulationEngine(level);
      const result = engine.run([{ type: 'MOVE_FORWARD' }]);
      expect(result.finalStatus).toBe('COLLISION');
    });
  });

  describe('trace invariants', () => {
    it('every snapshot has an increasing step number and final SUCCESS status', () => {
      const engine = new GridSimulationEngine(baseLevel);
      const result = engine.run([{ type: 'MOVE_FORWARD' }, { type: 'MOVE_FORWARD' }]);
      const steps = result.trace.map((s) => s.stepNumber);
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
      }
      expect(result.trace[result.trace.length - 1].status).toBe('SUCCESS');
    });
  });
});