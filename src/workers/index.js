const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const { config } = require('../config/app');

// Worker thread manager
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.maxWorkers = config.maxWorkers || 4;
    this.activeWorkers = 0;
  }

  // Create a new worker
  createWorker(workerType, data = {}) {
    return new Promise((resolve, reject) => {
      if (this.activeWorkers >= this.maxWorkers) {
        reject(new Error('Maximum number of workers reached'));
        return;
      }

      const worker = new Worker(path.join(__dirname, `${workerType}.js`), {
        workerData: {
          ...data,
          workerId: Date.now() + Math.random()
        }
      });

      const workerId = worker.workerData.workerId;
      this.workers.set(workerId, worker);
      this.activeWorkers++;

      // Handle worker messages
      worker.on('message', (result) => {
        resolve(result);
        this.cleanupWorker(workerId);
      });

      // Handle worker errors
      worker.on('error', (error) => {
        console.error(`Worker ${workerType} error:`, error);
        reject(error);
        this.cleanupWorker(workerId);
      });

      // Handle worker exit
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${workerType} stopped with exit code ${code}`);
        }
        this.cleanupWorker(workerId);
      });

      // Set timeout for worker
      setTimeout(() => {
        if (this.workers.has(workerId)) {
          console.warn(`Worker ${workerType} timed out`);
          worker.terminate();
          this.cleanupWorker(workerId);
          reject(new Error('Worker timeout'));
        }
      }, config.workerTimeout || 30000); // 30 seconds timeout
    });
  }

  // Clean up worker
  cleanupWorker(workerId) {
    if (this.workers.has(workerId)) {
      this.workers.delete(workerId);
      this.activeWorkers--;
    }
  }

  // Get worker statistics
  getStats() {
    return {
      activeWorkers: this.activeWorkers,
      maxWorkers: this.maxWorkers,
      availableWorkers: this.maxWorkers - this.activeWorkers
    };
  }

  // Terminate all workers
  async terminateAll() {
    const promises = Array.from(this.workers.values()).map(worker => {
      return new Promise((resolve) => {
        worker.terminate();
        worker.on('exit', () => resolve());
      });
    });

    await Promise.all(promises);
    this.workers.clear();
    this.activeWorkers = 0;
  }
}

// Worker types
const WORKER_TYPES = {
  FILE_PROCESSOR: 'fileProcessor',
  IMAGE_OPTIMIZER: 'imageOptimizer',
  VIDEO_PROCESSOR: 'videoProcessor',
  BACKGROUND_JOB: 'backgroundJob',
  DATA_PROCESSOR: 'dataProcessor'
};

// Export worker manager instance
const workerManager = new WorkerManager();

module.exports = {
  workerManager,
  WORKER_TYPES,
  createWorker: (type, data) => workerManager.createWorker(type, data),
  getStats: () => workerManager.getStats(),
  terminateAll: () => workerManager.terminateAll()
}; 