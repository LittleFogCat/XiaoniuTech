import http from 'http';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('=== 测试健康检查 ===');
  const health = await request('GET', '/health');
  console.log('Status:', health.status);
  console.log('Body:', health.body);

  console.log('\n=== 测试获取模型列表 ===');
  const models = await request('GET', '/api/models');
  console.log('Status:', models.status);
  const modelsData = JSON.parse(models.body);
  console.log('模型数量:', modelsData.models?.length);
  modelsData.models?.forEach(m => console.log(' -', m.name));

  console.log('\n=== 测试聊天接口 ===');
  const chat = await request('POST', '/api/chat', {
    model: 'glm-5.1',
    messages: [{ role: 'user', content: '你好' }],
  });
  console.log('Status:', chat.status);
  console.log('Body (前500字符):', chat.body.substring(0, 500));
}

test().catch(console.error);