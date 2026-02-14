import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read the SDP offer from the client
    const sdpOffer = await req.text();

    // Create an ephemeral token / session with OpenAI Realtime API
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "ash",
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI session error:", err);
      return new Response(JSON.stringify({ error: "Failed to create OpenAI session" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionData = await response.json();
    const ephemeralKey = sessionData.client_secret?.value;

    if (!ephemeralKey) {
      return new Response(JSON.stringify({ error: "No ephemeral key returned" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the ephemeral key to negotiate WebRTC with OpenAI
    const rtcResponse = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: sdpOffer,
      }
    );

    if (!rtcResponse.ok) {
      const err = await rtcResponse.text();
      console.error("OpenAI RTC error:", err);
      return new Response(JSON.stringify({ error: "WebRTC negotiation failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answerSdp = await rtcResponse.text();

    return new Response(answerSdp, {
      headers: { ...corsHeaders, "Content-Type": "application/sdp" },
    });
  } catch (err) {
    console.error("Session error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
