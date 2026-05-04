import nodemailer from 'nodemailer';
import dns from 'dns/promises';
import net from 'net';

let transporter = null;
let lastConfigKey = '';

const DEFAULT_SMTP_PORT = 80;

function getMailConfig() {
  const host = process.env.ALIYUN_SMTP_HOST || process.env.SMTP_HOST;
  const user = process.env.ALIYUN_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.ALIYUN_SMTP_PASS || process.env.SMTP_PASS;
  const port = Number(process.env.ALIYUN_SMTP_PORT || process.env.SMTP_PORT || DEFAULT_SMTP_PORT);
  const secureValue = String(process.env.ALIYUN_SMTP_SECURE || process.env.SMTP_SECURE || '');
  const secure = secureValue ? secureValue.toLowerCase() === 'true' : port === 465;
  const from = process.env.ALIYUN_SMTP_FROM || process.env.SMTP_FROM || `XiaoNiu Tech <${user}>`;

  if (!host || !user || !pass) {
    throw new Error('SMTP 配置缺失，请检查 ALIYUN_SMTP_HOST / ALIYUN_SMTP_USER / ALIYUN_SMTP_PASS');
  }

  return {
    host,
    port,
    secure,
    from,
    auth: {
      user,
      pass,
    },
  };
}

const SMTP_TIMEOUT_MS = 10_000;

function testTcpConnection(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

async function getTransporter() {
  const config = getMailConfig();
  const configKey = `${config.host}:${config.port}:${config.secure}`;

  if (transporter && configKey === lastConfigKey) {
    return transporter;
  }

  console.log('[mail] resolving DNS for', config.host);
  let resolvedIp;
  try {
    const result = await dns.resolve4(config.host);
    resolvedIp = result[0];
    console.log('[mail] DNS resolved', config.host, '->', result.join(', '));
  } catch (err) {
    console.error('[mail] DNS resolution FAILED for', config.host, ':', err.message);
    throw new Error(`无法解析邮件服务器地址 ${config.host}，请检查 DNS 配置`);
  }

  console.log('[mail] testing TCP connection to', resolvedIp, 'port', config.port);
  const tcpOk = await testTcpConnection(resolvedIp, config.port);
  if (!tcpOk) {
    console.error('[mail] TCP connection FAILED to', resolvedIp, 'port', config.port);
    throw new Error(`无法连接邮件服务器 ${config.host}:${config.port}，请检查防火墙是否放行该端口。阿里云 DirectMail 建议使用 465 (SSL) 端口`);
  }
  console.log('[mail] TCP connection OK to', resolvedIp, 'port', config.port);

  console.log('[mail] creating SMTP transporter host=', config.host, 'port=', config.port, 'secure=', config.secure);
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });

  console.log('[mail] verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('[mail] SMTP verify OK');
  } catch (err) {
    console.error('[mail] SMTP verify FAILED:', err.message);
    transporter = null;
    throw new Error(`SMTP 验证失败 (${config.host}:${config.port}): ${err.message}`);
  }

  lastConfigKey = configKey;
  return transporter;
}

export async function sendRegistrationCodeEmail(email, verificationCode) {
  const t0 = Date.now();
  const config = getMailConfig();
  console.log('[mail] sending code to=', email, 'from=', config.from, 'host=', config.host, 'port=', config.port);

  try {
    const t = await getTransporter();
    await t.sendMail({
      from: config.from,
      to: email,
      subject: 'XiaoNiu Tech 注册验证码',
      text: `您的验证码是 ${verificationCode}，10 分钟内有效。如果不是您本人操作，请忽略本邮件。`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <h2 style="margin-bottom:12px;">XiaoNiu Tech 邮箱验证</h2>
        <p>您好，您的注册验证码如下：</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;">${verificationCode}</p>
        <p>该验证码 10 分钟内有效。如非本人操作，请忽略此邮件。</p>
      </div>`,
    });
    console.log('[mail] sent successfully elapsed_ms=', Date.now() - t0);
  } catch (err) {
    console.error('[mail] sendMail failed:', err.message);
    transporter = null;
    lastConfigKey = '';
    throw err;
  }
}
