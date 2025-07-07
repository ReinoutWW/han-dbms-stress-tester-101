#!/usr/bin/env node

// Direct Kaggle data loader script that bypasses HTTP timeouts
const { MongoClient } = require('mongodb');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const { createReadStream } = require('fs');
const { parse } = require('csv-parse');
const path = require('path');

const config = {
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://admin:mongodb_pass_2024@mongodb.databases.svc.cluster.local:27017/showdown_benchmark?authSource=admin'
  },
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://elasticsearch.databases.svc.cluster.local:9200'
  },
  dataPath: process.env.DATA_PATH || '/data/kaggle-finance',
  batchSize: parseInt(process.env.BATCH_SIZE) || 10000,
  transactionLimit: parseInt(process.env.TRANSACTION_LIMIT) || 200000 // Default to 200k transactions
};

console.log('🚀 Starting direct Kaggle data loading...');
console.log('Configuration:', {
  dataPath: config.dataPath,
  batchSize: config.batchSize,
  transactionLimit: config.transactionLimit,
  mongodb: config.mongodb.url.replace(/:[^:]*@/, ':****@'),
  elasticsearch: config.elasticsearch.url
});

async function loadData() {
  const mongoClient = new MongoClient(config.mongodb.url);
  const elasticsearchClient = new ElasticsearchClient({ node: config.elasticsearch.url });
  
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = mongoClient.db('showdown_benchmark');
    
    // Test Elasticsearch
    await elasticsearchClient.ping();
    console.log('✅ Connected to Elasticsearch');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    try {
      await db.collection('users').drop();
      await db.collection('cards').drop();
      await db.collection('transactions').drop();
    } catch (error) {
      // Collections might not exist
    }
    
    try {
      await elasticsearchClient.indices.delete({ index: 'users' });
      await elasticsearchClient.indices.delete({ index: 'cards' });
      await elasticsearchClient.indices.delete({ index: 'transactions' });
    } catch (error) {
      // Indices might not exist
    }
    
    // Create Elasticsearch indices with mappings
    await createElasticsearchIndices(elasticsearchClient);
    
    // Create MongoDB collections
    const usersCollection = db.collection('users');
    const cardsCollection = db.collection('cards');
    const transactionsCollection = db.collection('transactions');
    
    // Load data files
    const startTime = Date.now();
    
    // Load users
    console.log('\n📁 Loading users...');
    const users = await loadCsvFile(path.join(config.dataPath, 'users_data.csv'), async (batch) => {
      await Promise.all([
        usersCollection.insertMany(batch),
        elasticsearchClient.bulk({
          body: batch.flatMap(u => [
            { index: { _index: 'users', _id: u.id } },
            u
          ])
        })
      ]);
    }, (row) => ({
      id: row.id,
      current_age: parseInt(row.current_age) || 0,
      retirement_age: parseInt(row.retirement_age) || 0,
      birth_year: parseInt(row.birth_year) || 0,
      birth_month: parseInt(row.birth_month) || 0,
      gender: row.gender || '',
      address: row.address || '',
      latitude: parseFloat(row.latitude) || 0,
      longitude: parseFloat(row.longitude) || 0,
      per_capita_income: parseFloat(row.per_capita_income) || 0
    }));
    console.log(`✅ Loaded ${users} users`);
    
    // Load cards
    console.log('\n📁 Loading cards...');
    const cards = await loadCsvFile(path.join(config.dataPath, 'cards_data.csv'), async (batch) => {
      await Promise.all([
        cardsCollection.insertMany(batch),
        elasticsearchClient.bulk({
          body: batch.flatMap(c => [
            { index: { _index: 'cards', _id: c.id } },
            c
          ])
        })
      ]);
    }, (row) => ({
      id: row.id,
      client_id: row.client_id,
      card_brand: row.card_brand || '',
      card_type: row.card_type || '',
      card_number: row.card_number || '',
      expires: row.expires || '',
      cvv: row.cvv || '',
      has_chip: row.has_chip === 'YES' || row.has_chip === 'TRUE',
      num_cards: parseInt(row.num_cards_issued) || 0,
      credit_limit: parseFloat(row.credit_limit) || 0
    }));
    console.log(`✅ Loaded ${cards} cards`);
    
    // Load transactions
    console.log(`\n📁 Loading transactions (limit: ${config.transactionLimit.toLocaleString()})...`);
    const transactions = await loadCsvFile(path.join(config.dataPath, 'transactions_data.csv'), async (batch) => {
      await Promise.all([
        transactionsCollection.insertMany(batch),
        elasticsearchClient.bulk({
          body: batch.flatMap(t => [
            { index: { _index: 'transactions', _id: t.id } },
            t
          ])
        })
      ]);
    }, (row) => ({
      id: row.id,
      date: new Date(row.date),
      client_id: row.client_id,
      card_id: row.card_id,
      amount: parseFloat(row.amount?.replace(/[$,]/g, '') || '0'),
      use_chip: row.use_chip === 'Chip Transaction',
      merchant_id: row.merchant_id || '',
      merchant_city: row.merchant_city || '',
      merchant_state: row.merchant_state || '',
      zip: row.zip || '',
      mcc: row.mcc || ''
    }), true, config.transactionLimit); // true = show progress, config.transactionLimit = record limit
    console.log(`✅ Loaded ${transactions.toLocaleString()} transactions`);
    
    // Create indexes
    console.log('\n🔧 Creating indexes...');
    await createMongoIndexes(db);
    
    // Refresh Elasticsearch
    await elasticsearchClient.indices.refresh({ index: ['users', 'cards', 'transactions'] });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n✅ Data loading completed in ${duration} seconds!`);
    console.log(`📊 Summary: ${users} users, ${cards} cards, ${transactions.toLocaleString()} transactions`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
  }
}

async function loadCsvFile(filepath, processBatch, transformRow, showProgress = false, recordLimit = null) {
  return new Promise((resolve, reject) => {
    let batch = [];
    let total = 0;
    let lastProgress = 0;
    
    const stream = createReadStream(filepath)
      .pipe(parse({
        columns: true,
        delimiter: ',',
        skip_empty_lines: true
      }));
    
    stream.on('data', async (row) => {
      try {
        // Check if we've reached the record limit
        if (recordLimit && total >= recordLimit) {
          stream.destroy(); // Stop reading the file
          return;
        }
        
        const transformed = transformRow(row);
        batch.push(transformed);
        
        if (batch.length >= config.batchSize) {
          stream.pause();
          
          // If adding this batch would exceed the limit, trim it
          if (recordLimit && total + batch.length > recordLimit) {
            batch = batch.slice(0, recordLimit - total);
          }
          
          await processBatch(batch);
          total += batch.length;
          
          if (showProgress && total - lastProgress >= 50000) {
            console.log(`  ⏳ Processed ${total.toLocaleString()} records...`);
            lastProgress = total;
          }
          
          batch = [];
          
          // Check if we've reached the limit after processing
          if (recordLimit && total >= recordLimit) {
            console.log(`  ✅ Reached transaction limit of ${recordLimit.toLocaleString()}`);
            stream.destroy();
            return;
          }
          
          stream.resume();
        }
      } catch (error) {
        console.error('Row error:', error);
      }
    });
    
    stream.on('end', async () => {
      if (batch.length > 0) {
        await processBatch(batch);
        total += batch.length;
      }
      resolve(total);
    });
    
    stream.on('error', reject);
  });
}

async function createElasticsearchIndices(client) {
  await client.indices.create({
    index: 'users',
    body: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          current_age: { type: 'integer' },
          retirement_age: { type: 'integer' },
          birth_year: { type: 'integer' },
          birth_month: { type: 'integer' },
          gender: { type: 'keyword' },
          address: { type: 'text' },
          latitude: { type: 'float' },
          longitude: { type: 'float' },
          per_capita_income: { type: 'float' }
        }
      }
    }
  });
  
  await client.indices.create({
    index: 'cards',
    body: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          client_id: { type: 'keyword' },
          card_brand: { type: 'keyword' },
          card_type: { type: 'keyword' },
          card_number: { type: 'keyword' },
          expires: { type: 'keyword' },
          cvv: { type: 'keyword' },
          has_chip: { type: 'boolean' },
          num_cards: { type: 'integer' },
          credit_limit: { type: 'float' }
        }
      }
    }
  });
  
  await client.indices.create({
    index: 'transactions',
    body: {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          date: { type: 'date' },
          client_id: { type: 'keyword' },
          card_id: { type: 'keyword' },
          amount: { type: 'float' },
          use_chip: { type: 'boolean' },
          merchant_id: { type: 'keyword' },
          merchant_city: { type: 'keyword' },
          merchant_state: { type: 'keyword' },
          zip: { type: 'keyword' },
          mcc: { type: 'keyword' }
        }
      }
    }
  });
}

async function createMongoIndexes(db) {
  const usersCollection = db.collection('users');
  const cardsCollection = db.collection('cards');
  const transactionsCollection = db.collection('transactions');
  
  await usersCollection.createIndex({ id: 1 });
  
  await cardsCollection.createIndex({ id: 1 });
  await cardsCollection.createIndex({ client_id: 1 });
  await cardsCollection.createIndex({ card_brand: 1 });
  
  await transactionsCollection.createIndex({ client_id: 1 });
  await transactionsCollection.createIndex({ card_id: 1 });
  await transactionsCollection.createIndex({ merchant_city: 1 });
  await transactionsCollection.createIndex({ merchant_state: 1 });
  await transactionsCollection.createIndex({ amount: 1 });
  await transactionsCollection.createIndex({ date: 1 });
  await transactionsCollection.createIndex({ mcc: 1 });
  
  console.log('✅ MongoDB indexes created');
}

// Run the loader
loadData().catch(console.error);