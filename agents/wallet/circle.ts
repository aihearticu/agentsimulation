/**
 * Circle Programmable Wallets Integration
 *
 * Provides secure wallet management for AI agents using Circle's
 * Developer-Controlled Wallets with MPC technology.
 *
 * @see https://developers.circle.com/w3s/developer-controlled-create-your-first-wallet
 */

import axios from 'axios';
import crypto from 'crypto';

// Types
export interface CircleConfig {
  apiKey: string;
  entitySecret: string;
  walletSetId?: string;
  baseUrl?: string;
}

export interface AgentWallet {
  id: string;
  address: string;
  blockchain: string;
  state: 'LIVE' | 'FROZEN';
  createDate: string;
  updateDate: string;
}

export interface WalletBalance {
  token: {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
}

export interface TransferResult {
  id: string;
  state: 'INITIATED' | 'PENDING' | 'COMPLETE' | 'FAILED';
  txHash?: string;
}

// Circle API Client
export class CircleWalletClient {
  private apiKey: string;
  private entitySecret: string;
  private walletSetId: string | null = null;
  private baseUrl: string;

  constructor(config: CircleConfig) {
    this.apiKey = config.apiKey;
    this.entitySecret = config.entitySecret;
    this.walletSetId = config.walletSetId || null;
    this.baseUrl = config.baseUrl || 'https://api.circle.com/v1/w3s';
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Add entity secret ciphertext for wallet operations
    if (data && this.entitySecret) {
      headers['X-Entity-Secret'] = await this.encryptEntitySecret();
    }

    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
      });
      return response.data.data;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Circle API error: ${message}`);
    }
  }

  private async encryptEntitySecret(): Promise<string> {
    // In production, this should use Circle's public key for encryption
    // For now, return the hex-encoded secret (simplified for demo)
    return this.entitySecret;
  }

  /**
   * Create a wallet set to group agent wallets
   */
  async createWalletSet(name: string): Promise<string> {
    const result = await this.request<{ walletSet: { id: string } }>(
      'POST',
      '/developer/walletSets',
      { name, idempotencyKey: crypto.randomUUID() }
    );
    this.walletSetId = result.walletSet.id;
    return this.walletSetId;
  }

  /**
   * Create a new wallet for an agent
   */
  async createAgentWallet(
    agentId: string,
    blockchain: 'BASE-SEPOLIA' | 'SOLANA-DEVNET' | 'ETH-SEPOLIA' = 'BASE-SEPOLIA'
  ): Promise<AgentWallet> {
    if (!this.walletSetId) {
      throw new Error('Wallet set not initialized. Call createWalletSet first.');
    }

    const result = await this.request<{ wallets: AgentWallet[] }>(
      'POST',
      '/developer/wallets',
      {
        idempotencyKey: crypto.randomUUID(),
        accountType: 'EOA',
        blockchains: [blockchain],
        count: 1,
        walletSetId: this.walletSetId,
        metadata: [
          { name: 'agentId', refId: agentId },
          { name: 'platform', refId: 'agentsimulation.ai' },
        ],
      }
    );

    return result.wallets[0];
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<AgentWallet> {
    return this.request<AgentWallet>('GET', `/wallets/${walletId}`);
  }

  /**
   * Get wallet balances
   */
  async getBalances(walletId: string): Promise<WalletBalance[]> {
    const result = await this.request<{ tokenBalances: WalletBalance[] }>(
      'GET',
      `/wallets/${walletId}/balances`
    );
    return result.tokenBalances;
  }

  /**
   * Transfer USDC between wallets
   */
  async transferUsdc(
    fromWalletId: string,
    toAddress: string,
    amountUsdc: string,
    blockchain: string = 'BASE-SEPOLIA'
  ): Promise<TransferResult> {
    // USDC contract addresses
    const usdcContracts: Record<string, string> = {
      'BASE-SEPOLIA': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      'ETH-SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      'SOLANA-DEVNET': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    };

    const result = await this.request<{ transfer: TransferResult }>(
      'POST',
      '/developer/transactions/transfer',
      {
        idempotencyKey: crypto.randomUUID(),
        walletId: fromWalletId,
        tokenAddress: usdcContracts[blockchain],
        destinationAddress: toAddress,
        amounts: [amountUsdc],
        blockchain,
      }
    );

    return result.transfer;
  }

  /**
   * Request testnet USDC from faucet
   */
  async requestTestnetUsdc(address: string, blockchain: string = 'BASE-SEPOLIA'): Promise<void> {
    await axios.post(
      'https://api.circle.com/v1/faucet/drips',
      {
        address,
        blockchain,
        usdc: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  /**
   * Sign typed data (for x402 payments)
   */
  async signTypedData(
    walletId: string,
    domain: any,
    types: any,
    message: any
  ): Promise<string> {
    const result = await this.request<{ signature: string }>(
      'POST',
      '/developer/sign/typedData',
      {
        walletId,
        data: JSON.stringify({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message,
        }),
      }
    );

    return result.signature;
  }
}

// Agent Wallet Manager
export class AgentWalletManager {
  private client: CircleWalletClient;
  private wallets: Map<string, AgentWallet> = new Map();

  constructor(config: CircleConfig) {
    this.client = new CircleWalletClient(config);
  }

  async initialize(walletSetName: string = 'AgentSimulation Agents'): Promise<void> {
    await this.client.createWalletSet(walletSetName);
    console.log('Wallet set initialized');
  }

  async provisionWallet(agentId: string): Promise<AgentWallet> {
    const wallet = await this.client.createAgentWallet(agentId);
    this.wallets.set(agentId, wallet);

    // Request testnet funds
    await this.client.requestTestnetUsdc(wallet.address);

    console.log(`Wallet provisioned for agent ${agentId}: ${wallet.address}`);
    return wallet;
  }

  async getBalance(agentId: string): Promise<string> {
    const wallet = this.wallets.get(agentId);
    if (!wallet) throw new Error(`No wallet for agent ${agentId}`);

    const balances = await this.client.getBalances(wallet.id);
    const usdcBalance = balances.find(b => b.token.symbol === 'USDC');
    return usdcBalance?.amount || '0';
  }

  async transfer(
    fromAgentId: string,
    toAddress: string,
    amountUsdc: string
  ): Promise<TransferResult> {
    const wallet = this.wallets.get(fromAgentId);
    if (!wallet) throw new Error(`No wallet for agent ${fromAgentId}`);

    return this.client.transferUsdc(wallet.id, toAddress, amountUsdc);
  }

  getWallet(agentId: string): AgentWallet | undefined {
    return this.wallets.get(agentId);
  }
}

// Export singleton for easy use
let walletManager: AgentWalletManager | null = null;

export function initializeWalletManager(config: CircleConfig): AgentWalletManager {
  walletManager = new AgentWalletManager(config);
  return walletManager;
}

export function getWalletManager(): AgentWalletManager {
  if (!walletManager) {
    throw new Error('Wallet manager not initialized. Call initializeWalletManager first.');
  }
  return walletManager;
}
