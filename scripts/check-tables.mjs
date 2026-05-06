import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

// Load env from .env.local if present
try {
  const envContent = readFileSync('/home/ubuntu/digital-planner/.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
} catch {}

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);
const [rows] = await conn.query("SHOW TABLES");
console.log('Existing tables:');
rows.forEach(r => console.log(' -', Object.values(r)[0]));

const createNotes = `CREATE TABLE IF NOT EXISTS notes (
  id int AUTO_INCREMENT NOT NULL,
  userId int NOT NULL,
  title varchar(512) NOT NULL DEFAULT 'Untitled',
  content text NOT NULL,
  folder varchar(128) NOT NULL DEFAULT 'All Notes',
  pinned boolean NOT NULL DEFAULT false,
  createdAt timestamp NOT NULL DEFAULT now(),
  updatedAt timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
)`;

const createReminders = `CREATE TABLE IF NOT EXISTS reminders (
  id int AUTO_INCREMENT NOT NULL,
  userId int NOT NULL,
  title varchar(512) NOT NULL,
  reminderAt timestamp NOT NULL,
  date varchar(10) NOT NULL,
  timeSlot varchar(5),
  notifyBrowser boolean NOT NULL DEFAULT true,
  notifySlack boolean NOT NULL DEFAULT false,
  sent boolean NOT NULL DEFAULT false,
  createdAt timestamp NOT NULL DEFAULT now(),
  updatedAt timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
)`;

const createIntegrations = `CREATE TABLE IF NOT EXISTS user_integrations (
  id int AUTO_INCREMENT NOT NULL,
  userId int NOT NULL,
  slackWebhookUrl text,
  slackChannelName varchar(128),
  googleAccessToken text,
  googleRefreshToken text,
  googleTokenExpiry timestamp NULL,
  googleCalendarId varchar(256),
  notionToken text,
  notionDatabaseId varchar(128),
  createdAt timestamp NOT NULL DEFAULT now(),
  updatedAt timestamp NOT NULL DEFAULT now() ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_integrations_userId_unique (userId)
)`;

await conn.query(createNotes);
console.log('notes table ensured');
await conn.query(createReminders);
console.log('reminders table ensured');
await conn.query(createIntegrations);
console.log('user_integrations table ensured');

const [rows2] = await conn.query("SHOW TABLES");
console.log('\nFinal tables:');
rows2.forEach(r => console.log(' -', Object.values(r)[0]));

await conn.end();
