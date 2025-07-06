const API_BASE_URL = 'http://localhost:3000/api';

export interface User {
  id: string;
  name: string;
  email?: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseStatus {
  success: boolean;
  status: {
    postgres: {
      connected: boolean;
      responseTime: number;
    };
    mongodb: {
      connected: boolean;
      responseTime: number;
    };
    elasticsearch: {
      connected: boolean;
      responseTime: number;
    };
  };
}

export interface StressTestResult {
  success: boolean;
  stats: {
    testInfo: {
      testId: string;
      userId: string;
      userName: string;
      startTime: number;
      endTime: number;
      duration: number;
      operationsRequested: number;
      totalOperations: number;
      scoreEarned: number;
    };
    mongodb: {
      totalOperations: number;
      successful: number;
      failed: number;
      successRate: number;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      medianResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      totalResponseTime: number;
      opsPerSecond: number;
      database: string;
      errors: string[];
      errorTypes: Record<string, number>;
      latencyBreakdown: {
        under_50ms: number;
        "50_100ms": number;
        "100_500ms": number;
        "500_1000ms": number;
        over_1000ms: number;
      };
    };
    elasticsearch: {
      totalOperations: number;
      successful: number;
      failed: number;
      successRate: number;
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      medianResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      totalResponseTime: number;
      opsPerSecond: number;
      database: string;
      errors: string[];
      errorTypes: Record<string, number>;
      latencyBreakdown: {
        under_50ms: number;
        "50_100ms": number;
        "100_500ms": number;
        "500_1000ms": number;
        over_1000ms: number;
      };
    };
    comparison: {
      winner: string;
      mongoAdvantage: number;
      successRateDiff: number;
      performanceRatio: number;
    };
  };
  message: string;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  score: number;
  totalTests: number;
  avgResponseTime: number;
  mongoTests: number;
  elasticTests: number;
  mongoAvgTime: number;
  elasticAvgTime: number;
  recentTests: number;
  performanceRating: string;
  preferredDatabase: string;
  efficiency: number;
  createdAt: string;
  lastActive: number;
  rank: number;
  isTopPerformer: boolean;
}

export interface LeaderboardResponse {
  success: boolean;
  leaderboard: LeaderboardUser[];
  totalUsers: number;
  totalTests: number;
  avgScore: number;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  async registerUser(userData: { name: string; university: string }): Promise<{ success: boolean; user: User; message: string }> {
    return this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getLeaderboard(): Promise<LeaderboardResponse> {
    return this.request('/users/');
  }

  async getDatabaseStatus(): Promise<DatabaseStatus> {
    return this.request('/stress-test/database/status');
  }

  async runStressTest(params: { 
    userId: string; 
    operations: number; 
    concurrency: number; 
  }): Promise<StressTestResult> {
    return this.request('/stress-test/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async loadTestData(): Promise<any> {
    return this.request('/stress-test/load-test-data', {
      method: 'POST',
    });
  }

  async loadKaggleData(): Promise<any> {
    return this.request('/stress-test/load-kaggle-data', {
      method: 'POST',
    });
  }

  async getUserById(userId: string): Promise<{ success: boolean; user: LeaderboardUser }> {
    return this.request(`/users/${userId}`);
  }
}

export const apiService = new ApiService(); 