/**
 * Cloudflare Worker Proxy for R2 Uploads
 * 
 * Instructions:
 * 1. Go to Cloudflare Dashboard -> Workers & Pages -> Create Application -> Create Worker
 * 2. Name it "xpressnurse-storage-proxy" and click Deploy
 * 3. Click "Edit Code" and paste this entire script.
 * 4. Go to Worker Settings -> Variables & Secrets:
 *    - Add a Secret named `UPLOAD_TOKEN` with a secure random string (e.g. "my-secret-token")
 * 5. Go to Worker Settings -> Bindings:
 *    - Add an R2 Bucket binding:
 *      - Variable name: `R2_BUCKET`
 *      - R2 bucket: `xpressnurse-storage`
 * 6. Deploy the worker.
 * 7. In your React app Admin Dashboard (or .env), set:
 *    - Endpoint: `https://xpressnurse-storage-proxy.<your-username>.workers.dev`
 *    - API Token: The secret string you set for `UPLOAD_TOKEN`
 */

export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight (OPTIONS request)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Default CORS headers for all other responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
    };

    // 2. Extract path (e.g. /xpressnurse-storage/prescriptions/file.pdf)
    const url = new URL(request.url);
    const path = url.pathname; // starts with /

    // If it's a GET request, allow public read (if you want your bucket public)
    // For this proxy, we assume GET requests go through your custom public domain instead.
    if (request.method === 'GET') {
      return new Response("This proxy is for uploading only. View files via your public R2 domain.", { status: 405, headers: corsHeaders });
    }

    // 3. Authenticate PUT / DELETE requests
    if (request.method === 'PUT' || request.method === 'DELETE') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${env.UPLOAD_TOKEN}`) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }

      // Remove the leading slash and bucket name if it's sent from the frontend
      // e.g. /xpressnurse-storage/prescriptions/file.pdf -> prescriptions/file.pdf
      let objectKey = path.substring(1);
      
      // Optional: if the frontend sends the bucket name in the path, strip it
      // Replace 'xpressnurse-storage' with your actual bucket name if different
      if (objectKey.startsWith('xpressnurse-storage/')) {
        objectKey = objectKey.replace('xpressnurse-storage/', '');
      }

      if (request.method === 'PUT') {
        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
        
        try {
          // Upload the request body directly to R2
          await env.R2_BUCKET.put(objectKey, request.body, {
            httpMetadata: { contentType }
          });
          
          return new Response(JSON.stringify({ success: true, key: objectKey }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      if (request.method === 'DELETE') {
        try {
          await env.R2_BUCKET.delete(objectKey);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
};
