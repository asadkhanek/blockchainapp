const WebSocket = require('ws');
const dotenv = require('dotenv');

dotenv.config();

// Define p2p port
const P2P_PORT = process.env.P2P_PORT || 5001;
const PEERS = process.env.PEERS ? process.env.PEERS.split(',') : [];

const MESSAGE_TYPES = {
  CHAIN: 'CHAIN',
  TRANSACTION: 'TRANSACTION',
  CLEAR_TRANSACTIONS: 'CLEAR_TRANSACTIONS',
};

class P2PServer {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.sockets = [];
  }

  listen() {
    const server = new WebSocket.Server({ port: P2P_PORT });
    server.on('connection', socket => this.connectSocket(socket));

    this.connectToPeers();

    console.log(`Listening for peer-to-peer connections on: ${P2P_PORT}`);
  }

  connectToPeers() {
    PEERS.forEach(peer => {
      const socket = new WebSocket(peer);
      socket.on('open', () => this.connectSocket(socket));
    });
  }

  connectSocket(socket) {
    this.sockets.push(socket);
    console.log('Socket connected');

    this.messageHandler(socket);

    this.sendChain(socket);
  }

  messageHandler(socket) {
    socket.on('message', message => {
      const data = JSON.parse(message);
      console.log('data', data);

      switch (data.type) {
        case MESSAGE_TYPES.CHAIN:
          this.handleChainMessage(data);
          break;
        case MESSAGE_TYPES.TRANSACTION:
          this.handleTransactionMessage(data);
          break;
        case MESSAGE_TYPES.CLEAR_TRANSACTIONS:
          this.blockchain.pendingTransactions = [];
          break;
      }
    });
  }

  handleChainMessage(data) {
    const receivedChain = data.chain;

    if (receivedChain.length > this.blockchain.chain.length) {
      console.log('Received blockchain is longer than current blockchain');
      this.blockchain.chain = receivedChain;
      // Broadcast the updated chain
      this.syncChains();
    }
  }

  handleTransactionMessage(data) {
    try {
      const transaction = data.transaction;
      this.blockchain.addTransaction(transaction);
    } catch (error) {
      console.log('Transaction is invalid:', error.message);
    }
  }

  sendChain(socket) {
    socket.send(JSON.stringify({
      type: MESSAGE_TYPES.CHAIN,
      chain: this.blockchain.chain
    }));
  }

  syncChains() {
    this.sockets.forEach(socket => this.sendChain(socket));
  }

  broadcastTransaction(transaction) {
    this.sockets.forEach(socket => {
      this.sendTransaction(socket, transaction);
    });
  }

  sendTransaction(socket, transaction) {
    socket.send(JSON.stringify({
      type: MESSAGE_TYPES.TRANSACTION,
      transaction
    }));
  }

  broadcastClearTransactions() {
    this.sockets.forEach(socket => {
      socket.send(JSON.stringify({
        type: MESSAGE_TYPES.CLEAR_TRANSACTIONS
      }));
    });
  }
}

module.exports = P2PServer;
