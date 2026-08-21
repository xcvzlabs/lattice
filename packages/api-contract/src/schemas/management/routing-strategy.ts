import * as v from 'valibot';

export const routingStrategySchema = v.picklist(['cost', 'latency', 'balanced']);
export type RoutingStrategy = v.InferOutput<typeof routingStrategySchema>;
