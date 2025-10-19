// 📈 Prometheus-Compatible Metrics
// Track performance and business metrics

export interface MetricLabels {
  [key: string]: string | number;
}

export interface CounterMetric {
  name: string;
  help: string;
  value: number;
  labels: MetricLabels;
}

export interface HistogramMetric {
  name: string;
  help: string;
  sum: number;
  count: number;
  buckets: Map<number, number>;
  labels: MetricLabels;
}

export class MetricsCollector {
  private counters: Map<string, CounterMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();

  /**
   * Increment counter
   */
  incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, {
        name,
        help: this.getHelpText(name),
        value,
        labels
      });
    }
  }

  /**
   * Observe histogram value (for latencies, sizes, etc.)
   */
  observeHistogram(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.histograms.get(key);

    if (existing) {
      existing.sum += value;
      existing.count += 1;
      this.updateBuckets(existing.buckets, value);
    } else {
      const buckets = new Map<number, number>();
      this.initializeBuckets(buckets);
      this.updateBuckets(buckets, value);

      this.histograms.set(key, {
        name,
        help: this.getHelpText(name),
        sum: value,
        count: 1,
        buckets,
        labels
      });
    }
  }

  /**
   * Get metric key from name and labels
   */
  private getMetricKey(name: string, labels: MetricLabels): string {
    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelPairs ? `${name}{${labelPairs}}` : name;
  }

  /**
   * Initialize histogram buckets (Prometheus defaults: 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s)
   */
  private initializeBuckets(buckets: Map<number, number>): void {
    const boundaries = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, Infinity];
    boundaries.forEach(boundary => buckets.set(boundary, 0));
  }

  /**
   * Update histogram buckets with observed value
   */
  private updateBuckets(buckets: Map<number, number>, value: number): void {
    buckets.forEach((count, boundary) => {
      if (value <= boundary) {
        buckets.set(boundary, count + 1);
      }
    });
  }

  /**
   * Get help text for metric
   */
  private getHelpText(name: string): string {
    const helpTexts: Record<string, string> = {
      'http_requests_total': 'Total number of HTTP requests',
      'http_request_duration_ms': 'HTTP request latency in milliseconds',
      'cache_operations_total': 'Total number of cache operations',
      'cache_hits_total': 'Total number of cache hits',
      'cache_misses_total': 'Total number of cache misses',
      'expert_requests_total': 'Total number of expert AI requests',
      'expert_latency_ms': 'Expert AI request latency in milliseconds',
      'expert_errors_total': 'Total number of expert AI errors',
      'db_query_duration_ms': 'Database query latency in milliseconds',
      'api_errors_total': 'Total number of API errors',
      'items_processed_total': 'Total number of items processed',
      'batch_size': 'Number of items in batch operations'
    };

    return helpTexts[name] || `Metric: ${name}`;
  }

  /**
   * Export metrics in Prometheus text format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Export counters
    this.counters.forEach(metric => {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} counter`);
      const labels = this.formatLabels(metric.labels);
      lines.push(`${metric.name}${labels} ${metric.value}`);
    });

    // Export histograms
    this.histograms.forEach(metric => {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} histogram`);

      const labels = this.formatLabels(metric.labels);
      const baseLabels = labels.slice(0, -1); // Remove trailing '}'

      // Buckets
      metric.buckets.forEach((count, boundary) => {
        const le = boundary === Infinity ? '+Inf' : boundary.toString();
        const bucketLabels = baseLabels ? `${baseLabels},le="${le}"}` : `{le="${le}"}`;
        lines.push(`${metric.name}_bucket${bucketLabels} ${count}`);
      });

      // Sum and count
      lines.push(`${metric.name}_sum${labels} ${metric.sum}`);
      lines.push(`${metric.name}_count${labels} ${metric.count}`);
    });

    return lines.join('\n') + '\n';
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels: MetricLabels): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';

    const formatted = entries
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `{${formatted}}`;
  }

  /**
   * Export metrics as JSON (for alternative monitoring systems)
   */
  exportJSON(): {
    counters: Array<CounterMetric>;
    histograms: Array<{
      name: string;
      help: string;
      sum: number;
      count: number;
      average: number;
      labels: MetricLabels;
    }>;
  } {
    const counters = Array.from(this.counters.values());
    const histograms = Array.from(this.histograms.values()).map(h => ({
      name: h.name,
      help: h.help,
      sum: h.sum,
      count: h.count,
      average: h.count > 0 ? h.sum / h.count : 0,
      labels: h.labels
    }));

    return { counters, histograms };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

/**
 * Global metrics collector instance
 */
export const metrics = new MetricsCollector();

/**
 * Helper functions for common metrics
 */
export const Metrics = {
  /**
   * Track HTTP request
   */
  trackRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    metrics.incrementCounter('http_requests_total', {
      method,
      path,
      status: statusCode
    });

    metrics.observeHistogram('http_request_duration_ms', durationMs, {
      method,
      path
    });
  },

  /**
   * Track cache operation
   */
  trackCache(operation: 'hit' | 'miss' | 'set', apiSource: string): void {
    metrics.incrementCounter('cache_operations_total', { operation, apiSource });

    if (operation === 'hit') {
      metrics.incrementCounter('cache_hits_total', { apiSource });
    } else if (operation === 'miss') {
      metrics.incrementCounter('cache_misses_total', { apiSource });
    }
  },

  /**
   * Track expert analysis
   */
  trackExpert(expert: string, success: boolean, latencyMs: number): void {
    metrics.incrementCounter('expert_requests_total', { expert, success: success.toString() });
    metrics.observeHistogram('expert_latency_ms', latencyMs, { expert });

    if (!success) {
      metrics.incrementCounter('expert_errors_total', { expert });
    }
  },

  /**
   * Track database query
   */
  trackDBQuery(operation: string, durationMs: number): void {
    metrics.observeHistogram('db_query_duration_ms', durationMs, { operation });
  },

  /**
   * Track API error
   */
  trackError(errorCode: string, endpoint: string): void {
    metrics.incrementCounter('api_errors_total', { errorCode, endpoint });
  },

  /**
   * Track items processed
   */
  trackItemsProcessed(category: string, count: number): void {
    metrics.incrementCounter('items_processed_total', { category }, count);
  },

  /**
   * Track batch operation
   */
  trackBatch(operation: string, size: number): void {
    metrics.observeHistogram('batch_size', size, { operation });
  }
};
