import {
  Direction,
  Position,
  ActionOpcode,
  LevelDefinition,
  SimulationStatus,
  StateSnapshot,
  SimulationResult,
} from './types.js';

// Direction vector deltas: [dx, dy]
const DIRECTION_DELTAS: Record<Direction, Position> = {
  NORTH: { x: 0, y: -1 },
  EAST:  { x: 1, y: 0 },
  SOUTH: { x: 0, y: 1 },
  WEST:  { x: -1, y: 0 },
};

// Rotation order: clockwise (0 -> 1 -> 2 -> 3)
const DIRECTIONS: readonly Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];

export class GridSimulationEngine {
  private readonly level: LevelDefinition;
  private readonly obstacleMap: ReadonlySet<string>;

  constructor(level: LevelDefinition) {
    this.level = level;
    // Spatial hash for O(1) collision detection: "x:y"
    this.obstacleMap = new Set(
      level.obstacles.map((obs) => `${obs.x}:${obs.y}`)
    );
  }

  public run(actions: readonly ActionOpcode[]): SimulationResult {
    let currentCar: Position = { ...this.level.start };
    let currentDir: Direction = this.level.startDirection;
    let stepCount = 0;

    const trace: StateSnapshot[] = [
      {
        stepNumber: 0,
        car: currentCar,
        direction: currentDir,
        status: 'RUNNING',
      },
    ];

    for (const action of actions) {
      stepCount++;

      // Check step ceiling
      if (stepCount > this.level.maxSteps) {
        trace.push({
          stepNumber: stepCount,
          car: currentCar,
          direction: currentDir,
          actionApplied: action,
          status: 'STEP_LIMIT_EXCEEDED',
        });
        return {
          success: false,
          finalStatus: 'STEP_LIMIT_EXCEEDED',
          totalSteps: stepCount,
          trace,
        };
      }

      // Execute discrete action
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

        // Out-of-bounds guard
        if (
          nextCar.x < 0 ||
          nextCar.x >= this.level.width ||
          nextCar.y < 0 ||
          nextCar.y >= this.level.height
        ) {
          trace.push({
            stepNumber: stepCount,
            car: nextCar,
            direction: currentDir,
            actionApplied: action,
            status: 'OUT_OF_BOUNDS',
          });
          return {
            success: false,
            finalStatus: 'OUT_OF_BOUNDS',
            totalSteps: stepCount,
            trace,
          };
        }

        // Obstacle collision guard
        if (this.obstacleMap.has(`${nextCar.x}:${nextCar.y}`)) {
          trace.push({
            stepNumber: stepCount,
            car: nextCar,
            direction: currentDir,
            actionApplied: action,
            status: 'COLLISION',
          });
          return {
            success: false,
            finalStatus: 'COLLISION',
            totalSteps: stepCount,
            trace,
          };
        }

        currentCar = nextCar;
      }

      // Check if target reached
      const reachedTarget =
        currentCar.x === this.level.target.x &&
        currentCar.y === this.level.target.y;

      if (reachedTarget) {
        trace.push({
          stepNumber: stepCount,
          car: currentCar,
          direction: currentDir,
          actionApplied: action,
          status: 'SUCCESS',
        });
        return {
          success: true,
          finalStatus: 'SUCCESS',
          totalSteps: stepCount,
          trace,
        };
      }

      trace.push({
        stepNumber: stepCount,
        car: currentCar,
        direction: currentDir,
        actionApplied: action,
        status: 'RUNNING',
      });
    }

    // Queue exhausted without reaching target
    return {
      success: false,
      finalStatus: 'TERMINATED_WITHOUT_TARGET',
      totalSteps: stepCount,
      trace,
    };
  }

  private rotate(current: Direction, deltaIndex: number): Direction {
    const currentIndex = DIRECTIONS.indexOf(current);
    const nextIndex = (currentIndex + deltaIndex + 4) % 4;
    return DIRECTIONS[nextIndex]!;
  }
}