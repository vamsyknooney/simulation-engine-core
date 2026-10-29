export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export type ActionOpcode =
  | { type: 'MOVE_FORWARD' }
  | { type: 'TURN_LEFT' }
  | { type: 'TURN_RIGHT' }
  | { type: 'PICKUP' }
  | { type: 'DROP' }
  | { type: 'RECHARGE' };

export interface LevelDefinition {
  // --- PHASE 1 (Standard) ---
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly start: Position;
  readonly startDirection: Direction;
  readonly target: Position;
  readonly obstacles: readonly Position[];
  readonly maxBlocks: number | null;
  readonly maxSteps: number;
  
  // --- PHASE 2 (Dynamic Routing & VIP) ---
  readonly initialBattery?: number;
  readonly initialTime?: number;
  
  readonly b_costs?: readonly (readonly number[])[];
  readonly t_costs?: readonly (readonly number[])[];
  readonly bb_costs?: readonly (readonly number[])[];
  readonly bt_costs?: readonly (readonly number[])[];
  
  readonly vipParcel?: Position; 
}

export type SimulationStatus =
  | 'RUNNING'
  | 'SUCCESS'
  | 'COLLISION'
  | 'OUT_OF_BOUNDS'
  | 'STEP_LIMIT_EXCEEDED'
  | 'TERMINATED_WITHOUT_TARGET'
  | 'BATTERY_DEPLETED'
  | 'TIME_DEPLETED';

export interface StateSnapshot {
  readonly stepNumber: number;
  readonly car: Position;
  readonly direction: Direction;
  readonly actionApplied?: ActionOpcode;
  readonly status: SimulationStatus;
  
  // HUD Data
  readonly battery?: number;
  readonly time?: number;
  readonly hasVipParcel?: boolean;
}

export interface SimulationResult {
  readonly success: boolean;
  readonly finalStatus: SimulationStatus;
  readonly totalSteps: number;
  readonly trace: readonly StateSnapshot[];
}