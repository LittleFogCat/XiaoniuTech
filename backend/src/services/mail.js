import nodemailer from 'nodemailer';

let transporter = null;

function getMailConfig() {
  const host = process.env.ALIYUN_SMTP_HOST || process.env.SMTP_HOST;
  const user = process.env.ALIYUN_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.ALIYUN_SMTP_PASS || process.env.SMTP_PASS;
  const port = Number(process.env.ALIYUN_SMTP_PORT || process.env.SMTP_PORT || 25);
  const secureValue = String(process.env.ALIYUN_SMTP_SECURE || process.env.SMTP_SECURE || '');
  const secure = secureValue ? secureValue.toLowerCase() === 'true' : port === 465;
  const from = process.env.ALIYUN_SMTP_FROM || process.env.SMTP_FROM || `XN Chat <${user}>`;

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

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const config = getMailConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  return transporter;
}

export async function sendRegistrationCodeEmail(email, verificationCode) {
  const config = getMailConfig();
  await getTransporter().sendMail({
    from: config.from,
    to: email,
    subject: 'XN Chat 注册验证码',
    text: `您的验证码是 ${verificationCode}，10 分钟内有效。如果不是您本人操作，请忽略本邮件。`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin-bottom:12px;">XN Chat 邮箱验证</h2>
      <p>您好，您的注册验证码如下：</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0;">${verificationCode}</p>
      <p>该验证码 10 分钟内有效。如非本人操作，请忽略此邮件。</p>
    </div>`,
  });
}