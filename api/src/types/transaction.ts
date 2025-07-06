// Updated transaction types based on actual dataset structure
export interface User {
  id: string;
  current_age: number;
  retirement_age: number;
  birth_year: number;
  birth_month: number;
  gender: string;
  address: string;
  latitude: number;
  longitude: number;
  per_capita_income: number;
  // Additional fields that may be present
  [key: string]: any;
}

export interface Card {
  id: string;
  client_id: string;
  card_brand: string;
  card_type: string;
  card_number: string;
  expires: string;
  cvv: string;
  has_chip: boolean;
  num_cards: number;
  credit_limit: number;
}

export interface Transaction {
  id: string;
  date: string;
  client_id: string;
  card_id: string;
  amount: number;
  use_chip: boolean;
  merchant_id: string;
  merchant_city: string;
  merchant_state: string;
  zip: string;
  mcc: string; // Merchant Category Code
}

export interface TransactionWithRelations extends Transaction {
  user?: User;
  card?: Card;
}

export interface StressTestResult {
  database: string;
  operation: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalTime: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  throughput: number;
  errors: string[];
  latencyBreakdown: {
    under50ms: number;
    ms50to100: number;
    ms100to500: number;
    ms500to1000: number;
    over1000ms: number;
  };
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface DatabaseComparison {
  mongodb: StressTestResult;
  elasticsearch: StressTestResult;
  winner: string;
  performanceDifference: string;
  summary: string;
}

export interface TransactionStats {
  totalTransactions: number;
  avgAmount: number;
  totalAmount: number;
  merchantCityDistribution: Record<string, number>;
  merchantStateDistribution: Record<string, number>;
  cardBrandDistribution: Record<string, number>;
  chipUsageDistribution: Record<string, number>;
  monthlyDistribution: Record<string, number>;
}

export interface DatabaseLoadResult {
  database: string;
  recordsLoaded: number;
  loadTime: number;
  errors: string[];
  stats: TransactionStats;
}

export interface TransactionQuery {
  minAmount?: number;
  maxAmount?: number;
  merchantCity?: string;
  merchantState?: string;
  cardBrand?: string;
  useChip?: boolean;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  limit?: number;
} 