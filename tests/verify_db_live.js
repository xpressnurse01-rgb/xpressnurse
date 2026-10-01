import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// WebSocket polyfill for Node.js 20
if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 1;
    onopen = null;
    onclose = null;
    onmessage = null;
    onerror = null;
    constructor() {}
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  }
  globalThis.WebSocket = MockWebSocket;
}

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = trimmed.split('=')[1].trim();
      }
      if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseAnonKey = trimmed.split('=')[1].trim();
      }
    }
  } catch (e) {
    console.error('Error reading .env file:', e);
  }
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase Connection to:', supabaseUrl);
  
  const tables = ['bookings', 'nurses', 'leads', 'services', 'consultations', 'coupons', 'app_users', 'audit_logs'];
  
  for (const table of tables) {
    try {
      const { data, count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Table [${table}]: Error - ${error.message} (Code: ${error.code})`);
      } else {
        console.log(`✅ Table [${table}]: Connected! Count: ${count}`);
      }
    } catch (e) {
      console.log(`❌ Table [${table}]: Exception -`, e.message);
    }
  }
}

testConnection();
