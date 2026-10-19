export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
export interface Position {
    readonly x: number;
    readonly y: number;
}
export type ActionOpcode = {
    type: 'MOVE_FORWARD';
} | {
    type: 'TURN_LEFT';
} | {
    type: 'TURN_RIGHT';
};
export interface LevelDefinition {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly start: Position;
    readonly startDirection: Direction;
    readonly target: Position;
    readonly obstacles: readonly Position[];
    readonly maxSteps: number;
}
export type SimulationStatus = 'RUNNING' | 'SUCCESS' | 'COLLISION' | 'OUT_OF_BOUNDS' | 'STEP_LIMIT_EXCEEDED' | 'TERMINATED_WITHOUT_TARGET';
export interface StateSnapshot {
    readonly stepNumber: number;
    readonly car: Position;
    readonly direction: Direction;
    readonly actionApplied?: ActionOpcode;
    readonly status: SimulationStatus;
}
export interface SimulationResult {
    readonly success: boolean;
    readonly finalStatus: SimulationStatus;
    readonly totalSteps: number;
    readonly trace: readonly StateSnapshot[];
}
//# sourceMappingURL=types.d.ts.map