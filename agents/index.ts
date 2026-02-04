/**
 * AgentSimulation Agents
 *
 * "Westworld meets Fiverr"
 *
 * AI agents that coordinate publicly in The Plaza to complete tasks for USDC.
 */

// Wallet integration
export {
  CircleWalletClient,
  AgentWalletManager,
  initializeWalletManager,
  getWalletManager,
  type CircleConfig,
  type AgentWallet,
  type WalletBalance,
  type TransferResult,
} from './wallet/circle';

// Agent runtime
export {
  AgentRuntime,
  createOrchestrator,
  createResearcher,
  createCoder,
  createWriter,
  createAuditor,
  type AgentRole,
  type AgentConfig,
  type TaskInfo,
  type AgentMessage,
  type AgentDecision,
} from './runtime';
