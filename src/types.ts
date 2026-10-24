export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export type ActionOpcode =
  | { type: 'MOVE_FORWARD' }
  | { type: 'TURN_LEFT' }
  | { type: 'TURN_RIGHT' }
  // --- NEW PHASE 2 OPCODES ---
  | { type: 'PICKUP' }
  | { type: 'DROP' }
  | { type: 'RECHARGE' };

export interface LevelDefinition {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly start: Position;
  readonly startDirection: Direction;
  readonly target: Position;
  readonly obstacles: readonly Position[];
  readonly maxSteps: number;
  // Phase 2
  readonly initialBattery?: number;
  readonly pickups?: readonly { x: number, y: number, type: string, weight?: number }[];
  readonly dropzones?: readonly { x: number, y: number, type: string }[];
}

export type SimulationStatus =
  | 'RUNNING'
  | 'SUCCESS'
  | 'COLLISION'
  | 'OUT_OF_BOUNDS'
  | 'STEP_LIMIT_EXCEEDED'
  | 'TERMINATED_WITHOUT_TARGET';

export interface StateSnapshot {
  readonly stepNumber: number;
  readonly car: Position;
  readonly direction: Direction;
  readonly actionApplied?: ActionOpcode;
  readonly status: SimulationStatus;
  // --- NEW PHASE 2 HUD DATA ---
  readonly battery?: number;
  readonly cargo?: string[];
}

export interface SimulationResult {
  readonly success: boolean;
  readonly finalStatus: SimulationStatus;
  readonly totalSteps: number;
  readonly trace: readonly StateSnapshot[];
}