export type BrokerSource = 'kite' | 'mofsl' | 'dhan' | 'nse_scrape' | 'replay';
export type OptionType = 'CE' | 'PE';
export type TradeSide = 'BUY' | 'SELL';
export type MarketRegime = 
  | 'Low IV Rangebound'
  | 'High IV Expansion'
  | 'Pre-Event IV Crush'
  | 'Trend Day Down'
  | 'Trend Day Up'
  | 'Expiry Gamma Spike';

export interface TradeLeg {
  id: string;
  trade_id: string;
  symbol: string;
  option_type: OptionType;
  strike_price: number;
  expiry: string;
  side: TradeSide;
  quantity: number;
  entry_price: number;
  ltp: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  pnl: number;
  iv_pnl: number;
  theta_pnl: number;
  delta_pnl: number;
}

export interface ActivePosition {
  id: string;
  strategy_type: 'SHORT STRADDLE' | 'IRON CONDOR' | 'BULL CALL_SPREAD' | 'SHORT STRANGLE';
  confidence: string;
  title: string;
  dte: string;
  driver_tag: string;
  pnl: number;
  entry_value: number;
  current_value: number;
  quantity: number;
  spot_price: number;
  iv: number;
  delta_pnl: number;
  gamma_pnl: number;
  theta_pnl: number;
  iv_pnl: number;
  residual_pnl: number;
  delta_greek: number;
  gamma_greek: number;
  theta_greek: number;
  vega_greek: number;
}

export interface Trade {
  id: string;
  broker_source: BrokerSource;
  strategy: string;
  underlying: string;
  entry_time: string;
  exit_time?: string;
  status: 'OPEN' | 'CLOSED';
  holding_period?: string;
  spot_at_entry: number;
  iv_at_entry: number;
  current_spot: number;
  current_iv: number;
  market_regime: MarketRegime;
  total_pnl: number;
  iv_component: number;
  theta_component: number;
  delta_component: number;
  gamma_component: number;
  vega_component: number;
  legs: TradeLeg[];
  notes?: string;
}

export interface PnLAttributionPoint {
  time: string;
  timestamp: number;
  total_pnl: number;
  iv_component: number;
  theta_component: number;
  delta_component: number;
  gamma_component: number;
  vega_component: number;
  spot_price: number;
}

export interface TraderDNAPattern {
  id: string;
  title: string;
  stat: string;
  description: string;
  category: 'IV Sensitivity' | 'Discipline' | 'Theta Harvesting' | 'Directional Drift';
  severity: 'warning' | 'positive' | 'neutral';
  occurrences: number;
  pnl_impact: number;
  recommendation: string;
}

export interface IvCurvePoint {
  strike: number;
  iv: number;
}

export interface OptionChainStrike {
  strike: number;
  callLtp: number;
  callIv: number;
  callDelta: number;
  callTheta: number;
  callOi: number;
  callVolume: number;
  putLtp: number;
  putIv: number;
  putDelta: number;
  putTheta: number;
  putOi: number;
  putVolume: number;
  isAtm?: boolean;
}
