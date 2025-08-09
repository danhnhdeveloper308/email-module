const { Redis } = require('ioredis');

async function testRedisConnection() {
  const redisUrl = 'rediss://default:AbQDAAIjcDFhMjRhYjJkYTBkYWY0YmU5ODJiNTNhNzBhZDZiMTJhNHAxMA@super-lab-46083.upstash.io:6379';
  
  console.log('🔍 Testing Redis connection...');
  
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 30000,
    commandTimeout: 10000,
    keepAlive: true,
    family: 4,
    tls: {
      rejectUnauthorized: false,
    }
  });

  try {
    console.log('📡 Connecting to Redis...');
    await redis.ping();
    console.log('✅ Redis connection successful');
    
    console.log('🧪 Testing basic operations...');
    await redis.set('test:key', 'hello world');
    const value = await redis.get('test:key');
    console.log('✅ Set/Get test:', value);
    
    await redis.del('test:key');
    console.log('✅ Delete test successful');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await redis.disconnect();
    console.log('🔌 Disconnected from Redis');
  }
}

testRedisConnection();
