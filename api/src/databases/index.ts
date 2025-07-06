import { MongoClient } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { config } from '../config';

// Database clients
let mongoClient: MongoClient | null = null;
let elasticsearchClient: ElasticsearchClient | null = null;

export async function connectDatabases() {
  console.log('Connecting to databases...');
  
  // Connect to MongoDB
  try {
    mongoClient = new MongoClient(config.databases.mongodb.url);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // Don't fail startup if MongoDB is not available yet
  }
  
  // Connect to Elasticsearch
  try {
    elasticsearchClient = new ElasticsearchClient({
      node: config.databases.elasticsearch.url,
    });
    
    // Test connection
    await elasticsearchClient.ping();
    console.log('✅ Connected to Elasticsearch');
  } catch (error) {
    console.error('❌ Elasticsearch connection failed:', error);
    // Don't fail startup if Elasticsearch is not available yet
  }
}

export function getMongoClient(): MongoClient {
  if (!mongoClient) {
    throw new Error('MongoDB client not initialized');
  }
  return mongoClient;
}

export function getElasticsearchClient(): ElasticsearchClient {
  if (!elasticsearchClient) {
    throw new Error('Elasticsearch client not initialized');
  }
  return elasticsearchClient;
}

export async function closeDatabases() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('MongoDB connection closed');
  }
  
  if (elasticsearchClient) {
    await elasticsearchClient.close();
    console.log('Elasticsearch connection closed');
  }
} 