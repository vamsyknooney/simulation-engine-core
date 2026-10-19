import { ActionOpcode, LevelDefinition, SimulationResult } from './types.js';
export declare class GridSimulationEngine {
    private readonly level;
    private readonly obstacleMap;
    constructor(level: LevelDefinition);
    run(actions: readonly ActionOpcode[]): SimulationResult;
    private rotate;
}
//# sourceMappingURL=engine.d.ts.map