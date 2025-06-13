import { app, powerMonitor, WebContents } from "electron";
// import { browser } from "@/main/index"; // Will be available at runtime
import { debugPrint } from "@/modules/output";

export interface PerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    external: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    percentCPUUsage: number;
    idleWakeupsPerSecond: number;
  };
  tabs: {
    total: number;
    active: number;
    sleeping: number;
    memory: number;
  };
  network: {
    requests: number;
    bytesReceived: number;
    bytesSent: number;
  };
  battery?: {
    charging: boolean;
    level: number;
  };
}

export interface TabPerformance {
  tabId: number;
  url: string;
  title: string;
  memory: number;
  cpu: number;
  networkRequests: number;
  isVisible: boolean;
  lastActive: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'memory' | 'cpu' | 'battery' | 'tab';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  resolved: boolean;
  data?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private maxMetricsHistory = 1000;

  // Thresholds
  private readonly thresholds = {
    memory: {
      warning: 0.8, // 80% of available memory
      critical: 0.9 // 90% of available memory
    },
    cpu: {
      warning: 70, // 70% CPU usage
      critical: 90 // 90% CPU usage
    },
    battery: {
      warning: 20, // 20% battery
      critical: 10 // 10% battery
    },
    tabMemory: {
      warning: 100 * 1024 * 1024, // 100MB per tab
      critical: 500 * 1024 * 1024 // 500MB per tab
    }
  };

  constructor() {
    this.setupPerformanceMonitor();
  }

  private setupPerformanceMonitor() {
    // Start monitoring when app is ready
    app.whenReady().then(() => {
      this.startMonitoring();
    });

    // Stop monitoring when app is quitting
    app.on("before-quit", () => {
      this.stopMonitoring();
    });

    // Monitor power events
    if (powerMonitor.isSupported()) {
      powerMonitor.on("on-battery", () => {
        this.createAlert({
          type: "battery",
          severity: "medium",
          message: "Device is now running on battery power. Consider enabling power saving mode."
        });
      });

      powerMonitor.on("on-ac", () => {
        this.resolveAlerts("battery");
      });

      powerMonitor.on("low-power", () => {
        this.createAlert({
          type: "battery",
          severity: "high",
          message: "Device is in low power mode. Browser performance may be reduced."
        });
      });
    }

    debugPrint("PERFORMANCE", "Performance monitor initialized");
  }

  public startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);

    debugPrint("PERFORMANCE", `Performance monitoring started (interval: ${interval}ms)`);
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    debugPrint("PERFORMANCE", "Performance monitoring stopped");
  }

  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();

      // Collect memory metrics
      const memoryUsage = process.memoryUsage();
      const systemMemory = process.getSystemMemoryInfo();

      // Collect CPU metrics
      const cpuUsage = process.getCPUUsage();

      // Collect tab metrics
      const tabMetrics = await this.collectTabMetrics();

      // Collect battery info if available
      let batteryInfo;
      if (powerMonitor.isSupported()) {
        try {
          batteryInfo = {
            charging: powerMonitor.isOnBatteryPower() === false,
            level: powerMonitor.getCurrentThermalState() // This is a rough approximation
          };
        } catch (error) {
          // Battery info not available on all platforms
        }
      }

      const metrics: PerformanceMetrics = {
        timestamp,
        memory: {
          used: memoryUsage.rss,
          total: systemMemory.total * 1024, // Convert from KB to bytes
          external: memoryUsage.external,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal
        },
        cpu: {
          percentCPUUsage: cpuUsage.percentCPUUsage,
          idleWakeupsPerSecond: cpuUsage.idleWakeupsPerSecond
        },
        tabs: tabMetrics,
        network: {
          requests: 0, // Would need to be tracked separately
          bytesReceived: 0,
          bytesSent: 0
        },
        battery: batteryInfo
      };

      this.metrics.push(metrics);

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Check for performance issues
      this.checkPerformanceThresholds(metrics);

    } catch (error) {
      debugPrint("PERFORMANCE", `Error collecting metrics: ${error}`);
    }
  }

  private async collectTabMetrics(): Promise<PerformanceMetrics['tabs']> {
    const { browser } = await import("@/main/index");
    if (!browser) {
      return { total: 0, active: 0, sleeping: 0, memory: 0 };
    }

    const allTabs = browser.tabs.getAllTabs();
    let totalMemory = 0;
    let activeTabs = 0;
    let sleepingTabs = 0;

    for (const tab of allTabs) {
      try {
        // Get memory usage for each tab
        const webContents = tab.webContents;
        if (webContents && !webContents.isDestroyed()) {
          const memoryInfo = await webContents.getProcessMemoryInfo();
          totalMemory += memoryInfo.residentSet * 1024; // Convert from KB to bytes

          if (tab.visible) {
            activeTabs++;
          } else if (tab.asleep) {
            sleepingTabs++;
          }
        }
      } catch (error) {
        // Tab might be destroyed or not accessible
      }
    }

    return {
      total: allTabs.length,
      active: activeTabs,
      sleeping: sleepingTabs,
      memory: totalMemory
    };
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Check memory usage
    const memoryUsagePercent = metrics.memory.used / metrics.memory.total;
    if (memoryUsagePercent > this.thresholds.memory.critical) {
      this.createAlert({
        type: "memory",
        severity: "high",
        message: `Critical memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%. Consider closing some tabs.`,
        data: { usage: memoryUsagePercent, used: metrics.memory.used, total: metrics.memory.total }
      });
    } else if (memoryUsagePercent > this.thresholds.memory.warning) {
      this.createAlert({
        type: "memory",
        severity: "medium",
        message: `High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%. Consider enabling tab sleeping.`,
        data: { usage: memoryUsagePercent }
      });
    }

    // Check CPU usage
    if (metrics.cpu.percentCPUUsage > this.thresholds.cpu.critical) {
      this.createAlert({
        type: "cpu",
        severity: "high",
        message: `Critical CPU usage: ${metrics.cpu.percentCPUUsage.toFixed(1)}%. Browser may become unresponsive.`,
        data: { usage: metrics.cpu.percentCPUUsage }
      });
    } else if (metrics.cpu.percentCPUUsage > this.thresholds.cpu.warning) {
      this.createAlert({
        type: "cpu",
        severity: "medium",
        message: `High CPU usage: ${metrics.cpu.percentCPUUsage.toFixed(1)}%. Check for resource-intensive tabs.`,
        data: { usage: metrics.cpu.percentCPUUsage }
      });
    }

    // Check battery level
    if (metrics.battery && !metrics.battery.charging) {
      if (metrics.battery.level < this.thresholds.battery.critical) {
        this.createAlert({
          type: "battery",
          severity: "high",
          message: `Critical battery level: ${metrics.battery.level}%. Enable power saving mode.`,
          data: { level: metrics.battery.level }
        });
      } else if (metrics.battery.level < this.thresholds.battery.warning) {
        this.createAlert({
          type: "battery",
          severity: "medium",
          message: `Low battery level: ${metrics.battery.level}%. Consider reducing browser activity.`,
          data: { level: metrics.battery.level }
        });
      }
    }
  }

  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a => 
      !a.resolved && 
      a.type === alert.type && 
      a.severity === alert.severity
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const newAlert: PerformanceAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: Date.now(),
      resolved: false
    };

    this.alerts.push(newAlert);
    debugPrint("PERFORMANCE", `Performance alert: ${alert.message}`);
  }

  private resolveAlerts(type: PerformanceAlert['type']): void {
    this.alerts.forEach(alert => {
      if (alert.type === type && !alert.resolved) {
        alert.resolved = true;
      }
    });
  }

  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public getMetricsHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  public async getTabPerformance(): Promise<TabPerformance[]> {
    const { browser } = await import("@/main/index");
    if (!browser) {
      return [];
    }

    const allTabs = browser.tabs.getAllTabs();
    const tabPerformance: TabPerformance[] = [];

    for (const tab of allTabs) {
      try {
        const webContents = tab.webContents;
        if (webContents && !webContents.isDestroyed()) {
          const memoryInfo = await webContents.getProcessMemoryInfo();
          
          tabPerformance.push({
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            memory: memoryInfo.residentSet * 1024, // Convert from KB to bytes
            cpu: 0, // Would need separate tracking
            networkRequests: 0, // Would need separate tracking
            isVisible: tab.visible,
            lastActive: tab.lastActiveTime || 0
          });
        }
      } catch (error) {
        // Tab might be destroyed or not accessible
      }
    }

    return tabPerformance.sort((a, b) => b.memory - a.memory);
  }

  public getPerformanceSummary(): {
    status: 'good' | 'warning' | 'critical';
    memoryUsage: number;
    cpuUsage: number;
    activeAlerts: number;
    recommendations: string[];
  } {
    const latest = this.getLatestMetrics();
    const activeAlerts = this.getActiveAlerts();

    if (!latest) {
      return {
        status: 'good',
        memoryUsage: 0,
        cpuUsage: 0,
        activeAlerts: 0,
        recommendations: []
      };
    }

    const memoryUsage = latest.memory.used / latest.memory.total;
    const cpuUsage = latest.cpu.percentCPUUsage;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    const recommendations: string[] = [];

    if (activeAlerts.some(a => a.severity === 'high')) {
      status = 'critical';
    } else if (activeAlerts.some(a => a.severity === 'medium') || memoryUsage > 0.7 || cpuUsage > 50) {
      status = 'warning';
    }

    // Generate recommendations
    if (memoryUsage > 0.8) {
      recommendations.push("Close unused tabs to free up memory");
      recommendations.push("Enable tab sleeping for background tabs");
    }

    if (cpuUsage > 70) {
      recommendations.push("Check for resource-intensive tabs");
      recommendations.push("Consider using focus mode to reduce distractions");
    }

    if (latest.tabs.total > 20) {
      recommendations.push("Consider organizing tabs into groups");
      recommendations.push("Bookmark tabs you don't need immediately");
    }

    return {
      status,
      memoryUsage,
      cpuUsage,
      activeAlerts: activeAlerts.length,
      recommendations
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  public clearMetricsHistory(): void {
    this.metrics = [];
    debugPrint("PERFORMANCE", "Metrics history cleared");
  }

  public clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
    debugPrint("PERFORMANCE", "Resolved alerts cleared");
  }
}

export const performanceMonitor = new PerformanceMonitor();
