const Redis = require('ioredis');

async function testUpstashConnection() {
  // ✅ Use correct port 6380 for SSL
  const redisUrl = 'rediss://default:AbQDAAIjcDFhMjRhYjJkYTBkYWY0YmU5ODJiNTNhNzBhZDZiMTJhNHAxMA@super-lab-46083.upstash.io:6380';
  
  console.log('🔍 Testing Upstash Redis connection with optimized settings...');
  
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    
    // ✅ Increased timeouts for Upstash stability  
    connectTimeout: 30000,   // 30 seconds
    commandTimeout: 20000,   // 20 seconds
    
    keepAlive: true,
    keepAliveInitialDelay: 30000, // 30 seconds
    family: 4,
    
    tls: {
      rejectUnauthorized: false,
      servername: 'super-lab-46083.upstash.io',
      checkServerIdentity: () => undefined,
      minVersion: 'TLSv1.2',
    },
    
    // ✅ Add reconnection logic
    reconnectOnError: (err) => {
      console.log('🔄 Attempting reconnection due to:', err.message);
      return true;
    }
  });

  // ✅ Add connection event listeners
  redis.on('connect', () => {
    console.log('🔗 Redis connecting...');
  });

  redis.on('ready', () => {
    console.log('✅ Redis connection ready');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', (time) => {
    console.log(`🔄 Redis reconnecting in ${time}ms...`);
  });

  try {
    console.log('📡 Attempting connection...');
    
    // ✅ Test with longer timeout
    const result = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 25 seconds')), 25000)
      )
    ]);
    
    console.log('✅ PING result:', result);
    
    // ✅ Test multiple operations to ensure stability
    console.log('🧪 Testing basic operations...');
    
    // Test 1: Set/Get
    const testKey = `test:${Date.now()}`;
    await redis.set(testKey, 'test-value', 'EX', 30);
    const value = await redis.get(testKey);
    console.log('✅ Set/Get test successful:', value);
    
    // Test 2: Hash operations
    await redis.hset('test:hash', 'field1', 'value1', 'field2', 'value2');
    const hashValue = await redis.hgetall('test:hash');
    console.log('✅ Hash operations successful:', hashValue);
    
    // Test 3: List operations  
    await redis.lpush('test:list', 'item1', 'item2', 'item3');
    const listLength = await redis.llen('test:list');
    console.log('✅ List operations successful, length:', listLength);
    
    // Cleanup
    await redis.del(testKey, 'test:hash', 'test:list');
    console.log('✅ Cleanup successful');
    
    // ✅ Test connection persistence
    console.log('🔄 Testing connection persistence...');
    for (let i = 0; i < 5; i++) {
      await redis.ping();
      console.log(`  Ping ${i + 1}/5: OK`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('📊 Server info:');
    const info = await redis.info('server');
    console.log(info.split('\n').slice(0, 8).join('\n'));
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      port: error.port
    });
    
    console.log('\n🔍 Diagnostic information:');
    console.log('- ✅ Using correct SSL port 6380');
    console.log('- ✅ TLS configuration optimized for Upstash');
    console.log('- ✅ Increased timeouts to 30s connect, 20s command');
    console.log('- ✅ Keepalive enabled with 30s interval');
    console.log('');
    console.log('🛠️  Possible solutions:');
    console.log('1. Check if your IP is whitelisted in Upstash console');
    console.log('2. Verify the Redis URL credentials are correct');
    console.log('3. Try different network (mobile hotspot) to test connectivity');
    console.log('4. Check firewall settings');
    console.log('5. Contact Upstash support if issue persists');
    
    console.log('\n📍 Upstash Console: https://console.upstash.com/');
  } finally {
    await redis.disconnect();
    console.log('🔌 Disconnected from Redis');
  }
}

testUpstashConnection();
