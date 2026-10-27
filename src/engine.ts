import {
  Direction,
  Position,
  ActionOpcode,
  LevelDefinition,
  SimulationStatus,
  StateSnapshot,
  SimulationResult,
} from './types.js';

const DIRECTION_DELTAS: Record<Direction, Position> = {
  NORTH: { x: 0, y: -1 },
  EAST:  { x: 1, y: 0 },
  SOUTH: { x: 0, y: 1 },
  WEST:  { x: -1, y: 0 },
};

const DIRECTIONS: readonly Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export class GridSimulationEngine {
  private readonly level: LevelDefinition;
  private readonly obstacleMap: ReadonlySet<string>;

  constructor(level: LevelDefinition) {
    this.level = level;
    this.obstacleMap = new Set(
      level.obstacles.map((obs) => `${obs.x}:${obs.y}`)
    );
  }

  public run(actions: readonly ActionOpcode[]): SimulationResult {
    let currentCar: Position = { ...this.level.start };
    let currentDir: Direction = this.level.startDirection;
    let stepCount = 0;

    let currentBattery = this.level.initialBattery;
    let currentTime = this.level.initialTime;
    let hasVipParcel = false;

    const trace: StateSnapshot[] = [
      {
        stepNumber: 0,
        car: currentCar,
        direction: currentDir,
        status: 'RUNNING',
        battery: currentBattery,
        time: currentTime,
        hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
      },
    ];

    for (const action of actions) {
      stepCount++;

      if (stepCount > this.level.maxSteps) {
        trace.push({
          stepNumber: stepCount, car: currentCar, direction: currentDir, actionApplied: action,
          status: 'STEP_LIMIT_EXCEEDED', battery: currentBattery, time: currentTime,
          hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
        });
        return { success: false, finalStatus: 'STEP_LIMIT_EXCEEDED', totalSteps: stepCount, trace };
      }

      if (action.type === 'TURN_LEFT') {
        currentDir = this.rotate(currentDir, -1);
      } else if (action.type === 'TURN_RIGHT') {
        currentDir = this.rotate(currentDir, 1);
      } else if (action.type === 'MOVE_FORWARD') {
        const delta = DIRECTION_DELTAS[currentDir];
        const nextCar: Position = {
          x: currentCar.x + delta.x,
          y: currentCar.y + delta.y,
        };

        if (
          nextCar.x < 0 || nextCar.x >= this.level.width ||
          nextCar.y < 0 || nextCar.y >= this.level.height
        ) {
          trace.push({
            stepNumber: stepCount, car: nextCar, direction: currentDir, actionApplied: action,
            status: 'OUT_OF_BOUNDS', battery: currentBattery, time: currentTime,
            hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
          });
          return { success: false, finalStatus: 'OUT_OF_BOUNDS', totalSteps: stepCount, trace };
        }

        if (this.obstacleMap.has(`${nextCar.x}:${nextCar.y}`)) {
          const canBypass = this.level.vipParcel !== undefined && hasVipParcel;

          if (!canBypass) {
            trace.push({
              stepNumber: stepCount, car: nextCar, direction: currentDir, actionApplied: action,
              status: 'COLLISION', battery: currentBattery, time: currentTime,
              hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
            });
            return { success: false, finalStatus: 'COLLISION', totalSteps: stepCount, trace };
          }
        }

        // Phase 2: Deduct costs of the block we are LEAVING
        if (this.level.b_costs && currentBattery !== undefined) {
          const cost = this.level.b_costs[currentCar.y][currentCar.x];
          if (cost !== undefined) {
            currentBattery -= cost;
            if (currentBattery < 0) {
              trace.push({
                stepNumber: stepCount, car: currentCar, direction: currentDir, actionApplied: action,
                status: 'BATTERY_DEPLETED', battery: currentBattery, time: currentTime,
                hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
              });
              return { success: false, finalStatus: 'BATTERY_DEPLETED', totalSteps: stepCount, trace };
            }
          }
        }
        
        if (this.level.t_costs && currentTime !== undefined) {
          const cost = this.level.t_costs[currentCar.y][currentCar.x];
          if (cost !== undefined) {
            currentTime -= cost;
            if (currentTime < 0) {
              trace.push({
                stepNumber: stepCount, car: currentCar, direction: currentDir, actionApplied: action,
                status: 'TIME_DEPLETED', battery: currentBattery, time: currentTime,
                hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
              });
              return { success: false, finalStatus: 'TIME_DEPLETED', totalSteps: stepCount, trace };
            }
          }
        }

        // Update the position AFTER deducting the current block's cost
        currentCar = nextCar;

      } else if (action.type === 'RECHARGE') {
        if (currentBattery !== undefined) {
          currentBattery = this.level.initialBattery ?? 100;
        }
        if (currentTime !== undefined) {
          currentTime -= 10; 
          if (currentTime < 0) {
            trace.push({
              stepNumber: stepCount, car: currentCar, direction: currentDir, actionApplied: action,
              status: 'TIME_DEPLETED', battery: currentBattery, time: currentTime,
              hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
            });
            return { success: false, finalStatus: 'TIME_DEPLETED', totalSteps: stepCount, trace };
          }
        }
      } else if (action.type === 'PICKUP') {
        if (this.level.vipParcel && this.level.vipParcel.x === currentCar.x && this.level.vipParcel.y === currentCar.y) {
          hasVipParcel = true;
        }
      } else if (action.type === 'DROP') {
        hasVipParcel = false;
      }

      const reachedTarget =
        currentCar.x === this.level.target.x &&
        currentCar.y === this.level.target.y;

      if (reachedTarget) {
        trace.push({
          stepNumber: stepCount, car: currentCar, direction: currentDir, actionApplied: action,
          status: 'SUCCESS', battery: currentBattery, time: currentTime,
          hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
        });
        return { success: true, finalStatus: 'SUCCESS', totalSteps: stepCount, trace };
      }

      trace.push({
        stepNumber: stepCount, car: currentCar, direction: currentDir, actionApplied: action,
        status: 'RUNNING', battery: currentBattery, time: currentTime,
        hasVipParcel: this.level.vipParcel ? hasVipParcel : undefined,
      });
    }

    return { success: false, finalStatus: 'TERMINATED_WITHOUT_TARGET', totalSteps: stepCount, trace };
  }

  private rotate(current: Direction, deltaIndex: number): Direction {
    const currentIndex = DIRECTIONS.indexOf(current);
    const nextIndex = (currentIndex + deltaIndex + 4) % 4;
    return DIRECTIONS[nextIndex]!;
  }
}