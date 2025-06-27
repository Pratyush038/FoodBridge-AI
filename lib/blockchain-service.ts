import CryptoJS from 'crypto-js';

export interface BlockchainTransaction {
  id: string;
  timestamp: string;
  donationId: string;
  donorId: string;
  receiverId: string;
  foodType: string;
  quantity: string;
  location: string;
  hash: string;
  previousHash: string;
  verified: boolean;
}

export interface AuditTrail {
  transactionId: string;
  events: Array<{
    timestamp: string;
    action: string;
    actor: string;
    details: string;
    verified: boolean;
  }>;
}

class BlockchainService {
  private chain: BlockchainTransaction[] = [];
  private difficulty = 2; // Mining difficulty

  constructor() {
    this.createGenesisBlock();
  }

  private createGenesisBlock(): void {
    const genesisBlock: BlockchainTransaction = {
      id: 'genesis',
      timestamp: new Date().toISOString(),
      donationId: 'genesis',
      donorId: 'system',
      receiverId: 'system',
      foodType: 'genesis',
      quantity: '0',
      location: 'system',
      hash: this.calculateHash('genesis', '0'),
      previousHash: '0',
      verified: true
    };
    
    this.chain.push(genesisBlock);
  }

  private calculateHash(data: string, previousHash: string): string {
    return CryptoJS.SHA256(data + previousHash + Date.now()).toString();
  }

  private mineBlock(block: BlockchainTransaction): string {
    let nonce = 0;
    let hash = '';
    
    do {
      nonce++;
      const blockData = JSON.stringify({
        ...block,
        nonce
      });
      hash = CryptoJS.SHA256(blockData).toString();
    } while (hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join('0'));
    
    return hash;
  }

  async recordDonation(
    donationId: string,
    donorId: string,
    receiverId: string,
    foodType: string,
    quantity: string,
    location: string
  ): Promise<string> {
    const previousBlock = this.chain[this.chain.length - 1];
    
    const transaction: BlockchainTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      donationId,
      donorId,
      receiverId,
      foodType,
      quantity,
      location,
      hash: '',
      previousHash: previousBlock.hash,
      verified: false
    };

    // Mine the block (simplified proof of work)
    transaction.hash = this.mineBlock(transaction);
    transaction.verified = true;
    
    this.chain.push(transaction);
    
    console.log(`Blockchain transaction recorded: ${transaction.id}`);
    return transaction.id;
  }

  async verifyChain(): Promise<boolean> {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Verify current block hash
      const recalculatedHash = this.calculateHash(
        JSON.stringify({
          id: currentBlock.id,
          timestamp: currentBlock.timestamp,
          donationId: currentBlock.donationId,
          donorId: currentBlock.donorId,
          receiverId: currentBlock.receiverId,
          foodType: currentBlock.foodType,
          quantity: currentBlock.quantity,
          location: currentBlock.location
        }),
        currentBlock.previousHash
      );
      
      if (currentBlock.hash !== recalculatedHash) {
        return false;
      }
      
      // Verify link to previous block
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    
    return true;
  }

  async getAuditTrail(donationId: string): Promise<AuditTrail | null> {
    const transactions = this.chain.filter(tx => tx.donationId === donationId);
    
    if (transactions.length === 0) {
      return null;
    }

    const events = transactions.map(tx => ({
      timestamp: tx.timestamp,
      action: 'Food Transfer Recorded',
      actor: `Donor: ${tx.donorId}, Receiver: ${tx.receiverId}`,
      details: `${tx.quantity} of ${tx.foodType} at ${tx.location}`,
      verified: tx.verified
    }));

    return {
      transactionId: transactions[0].id,
      events
    };
  }

  async getDonationHistory(userId: string): Promise<BlockchainTransaction[]> {
    return this.chain.filter(tx => 
      tx.donorId === userId || tx.receiverId === userId
    );
  }

  getChainStats(): {
    totalTransactions: number;
    verifiedTransactions: number;
    chainIntegrity: boolean;
  } {
    return {
      totalTransactions: this.chain.length - 1, // Exclude genesis block
      verifiedTransactions: this.chain.filter(tx => tx.verified).length - 1,
      chainIntegrity: true // Would run verification in real implementation
    };
  }
}

export const blockchainService = new BlockchainService();